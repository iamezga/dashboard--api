import { BadRequestError, UnauthorizedError } from '@/errors'
import { UseCase } from '@/lib/UseCase'
import {
	JwtUserPayload,
	LoginOutput,
	UserLoginDetails
} from '@/modules/auth/entities/AuthDataTypes'
import { RoleRepositoryInterface } from '@/modules/role'
import { SessionRepositoryInterface } from '@/modules/session'
import {
	MergedPermissionData,
	SessionData,
	SessionUser
} from '@/modules/session/entities/Session'
import { UserRepositoryInterface } from '@/modules/user/entities/UserRepositoryInterface'
import { DependencyContainer } from '@/services/dependencyContainer'
import { JobInterface } from '@/types/job/JobInterface'
import { UseCasePermissionValidationData } from '@/types/useCase/UseCasePermissionValidationData'
import { UseCaseResponseInterface } from '@/types/useCase/UseCaseResponseInterface'
import { verify } from 'argon2'
import jwt from 'jsonwebtoken'
import ms, { StringValue } from 'ms'
import { AuthLoginJobInterface } from './AuthLoginJobInterface'

/**
 * @class AuthLoginUseCase
 * @description Handles the user authentication (login) process.
 * It verifies user credentials and generates a JWT token upon successful authentication,
 * leveraging the UserRepository for data access.
 * @permission auth.login
 */
export class AuthLoginUseCase extends UseCase<AuthLoginJobInterface> {
	static readonly permission: string = 'auth.login'
	private userRepository: UserRepositoryInterface
	private roleRepository: RoleRepositoryInterface
	private sessionRepository: SessionRepositoryInterface
	private jwt: typeof jwt
	private jwtSecret: string
	private jwtExpiresIn: string
	private argon2Verify: typeof verify
	private msConverter: typeof ms

	constructor(container: DependencyContainer) {
		super(container)
		this.userRepository = container.repositories.user
		this.roleRepository = container.repositories.role
		this.sessionRepository = container.repositories.session
		this.jwt = container.thirdParties.jwt
		this.jwtSecret = container.config.get('jwt.secret')
		this.jwtExpiresIn = container.config.get('jwt.expiresIn')
		this.argon2Verify = container.thirdParties.argon2.verify
		this.argon2Verify = container.thirdParties.argon2.verify
		this.msConverter = container.thirdParties.ms

		if (!this.jwtSecret) {
			throw new Error('JWT SECRET is not defined')
		}
		if (!this.jwtExpiresIn) {
			throw new Error('JWT EXPIRES IN is not defined')
		}
	}

	/**
	 * Private helper to merge the base configuration of a permission with
	 * the role-specific configuration.
	 * Uses a deep merge to ensure nested properties are correctly combined.
	 * @param {Record<string, any> | null} baseConfig - Base configuration from the Permission (Permission.config).
	 * @param {Record<string, any> | null} roleSpecificConfig - Specific configuration from the Role-Permission relation (RolePermission.config).
	 * @returns {Record<string, any>} The merged effective configuration.
	 */
	private mergePermissionConfigs(
		baseConfig: Record<string, any>,
		roleSpecificConfig: Record<string, any>
	): Record<string, any> {
		return this.container.utils.deepMerge(baseConfig, roleSpecificConfig)
	}

	/**
	 * Provides the validation schema and data for the `auth.login` permission check.
	 * It dynamically generates the schema based on the permission config,
	 * @param {JobInterface} job - The job object containing the user context and request metadata.
	 * @param {DependencyContainer} container - The application's dependency container.
	 * @returns {Promise<UseCasePermissionValidationData>} A promise that resolves to the schema and data for validation.
	 */
	static async getPermissionValidationData(
		job: JobInterface,
		container: DependencyContainer
	): Promise<UseCasePermissionValidationData> {
		const permissions = job.getUser().permissions
		const meta = job.getMeta()

		const data: Record<string, any> = {
			permission: AuthLoginUseCase.permission
		}

		const schema: Record<string, any> = {
			permission: {
				type: 'enum',
				values: Object.keys(permissions)
			}
		}
		if (permissions[AuthLoginUseCase.permission]) {
			const { config } = permissions[AuthLoginUseCase.permission]
			if (config.conditions) {
				if (config.conditions?.accessDays?.enabled) {
					data.accessDay = container.thirdParties
						.dayjs(meta.timestamp)
						.format('dddd')
					schema.accessDay = {
						type: 'enum',
						values: config.conditions.accessDays.values
					}
				}
				if (config.conditions?.accessTime?.enabled) {
					data.accessTime = container.thirdParties
						.dayjs(meta.timestamp)
						.format('HH:mm')
					schema.accessTime = {
						type: 'multiAll',
						rules: [
							{
								type: 'compare',
								comparison: 'gte',
								value: config.conditions.accessTime.options.from
							},
							{
								type: 'compare',
								comparison: 'lte',
								value: config.conditions.accessTime.options.to
							}
						]
					}
				}
			}
		}

		return { schema, data }
	}

	/**
	 * Executes the user login business logic.
	 * @param {AuthLoginJobInterface} job - The Job object containing the login credentials.
	 * @returns {Promise<UseCaseResponseInterface<LoginOutput>>} A promise that resolves with the authentication token and public user data.
	 * @throws {BadRequestError} If credentials are incorrect, the user is inactive, or the password is invalid.
	 * @throws {UnauthorizedError} If the user's role is invalid/inactive, or if login authorization rules (e.g., time/day restrictions) are not met.
	 * @throws {Error} For unexpected internal errors.
	 */
	public async run(
		job: AuthLoginJobInterface
	): Promise<UseCaseResponseInterface<LoginOutput>> {
		const { email, password } = job.getData()

		// Find user authentication details
		const userAuthDetails =
			await this.container.repositories.user.findUserAuthDetailsByEmail(email)

		// Check if user exists and is active
		if (
			!userAuthDetails ||
			!userAuthDetails.active ||
			userAuthDetails.deletedAt
		) {
			this.container.logger.warn(
				`Login attempt for inactive or non-existent user: ${email}`
			)
			throw new BadRequestError('Incorrect credentials', [
				{
					field: 'credentials',
					message: 'Incorrect credentials',
					type: 'incorrectCredentials'
				}
			])
		}

		// Verify the password
		const passwordMatch = await this.argon2Verify(
			userAuthDetails.passwordHash,
			password
		)
		if (!passwordMatch) {
			this.container.logger.warn(
				`Failed login attempt for user: ${email} (incorrect password)`
			)
			throw new BadRequestError('Incorrect credentials', [
				{
					field: 'credentials',
					message: 'Incorrect credentials',
					type: 'incorrectCredentials'
				}
			])
		}

		if (!userAuthDetails.roleId) {
			// This is a system-level issue if a user has no role, UnauthorizedError is appropriate here
			throw new UnauthorizedError('User has no assigned role, cannot log in.')
		}

		const roleWithPermissions =
			await this.roleRepository.findByIdWithPermissions(userAuthDetails.roleId)

		if (!roleWithPermissions || !roleWithPermissions.active) {
			throw new UnauthorizedError(
				'User role is invalid or inactive, cannot log in.'
			)
		}

		const mergedPermissions: Record<string, MergedPermissionData> = {}

		// Iterate through role's permissions
		// Assuming roleWithPermissions.rolePermissions is an array of { permission: Permission, config: JsonObject }
		for (const rolePermissionDetail of roleWithPermissions.rolePermissions) {
			const permission = rolePermissionDetail.permission
			// Only include active and non-deleted permissions
			if (!permission.active || permission.deletedAt) continue

			const effectiveConfig = this.mergePermissionConfigs(
				permission.config, // Base config from the Permission
				rolePermissionDetail.config // Specific config from the Role-Permission relation
			)

			mergedPermissions[permission.key] = {
				key: permission.key,
				label: permission.label,
				description: permission.description || undefined,
				scope: permission.scope,
				config: effectiveConfig
			}
		}

		// | Future extension: Logic for userPermissionOverride would be added here.
		// | It would further merge configurations on top of role-based permissions.

		job.setUser({
			...userAuthDetails,
			permissions: mergedPermissions
		})

		const { data, schema } = await AuthLoginUseCase.getPermissionValidationData(
			job,
			this.container
		)
		const errors = await this.container.validator.validate(data, schema)
		if (errors.length) {
			throw new UnauthorizedError(
				`Authorization failed: you don't have permissions for this action.`
			)
		}

		const currentTime = new Date()

		// Update last login
		const updatedUser = await this.userRepository.update(userAuthDetails.id, {
			lastLogin: currentTime
		})
		if (!updatedUser) {
			this.container.logger.error(
				`Failed to update last login for user: ${userAuthDetails.email}`
			)
			throw new Error('Could not update user login timestamp.')
		}
		this.container.logger.info(
			`User ${userAuthDetails.email} successfully logged in.`
		)

		// 8. Prepare session data for Redis
		// Convert JWT expiresIn string (e.g., "1h") to seconds for Redis TTL
		const jwtExpiresInMilliseconds = this.msConverter(
			this.jwtExpiresIn as StringValue
		) // 'ms' returns milliseconds
		const jwtExpiresInSeconds = jwtExpiresInMilliseconds / 1000

		// Create the user snapshot for the session
		const sessionUser: SessionUser = {
			id: updatedUser.id,
			organizationId: updatedUser.organizationId,
			roleId: updatedUser.roleId,
			name: updatedUser.name,
			surname: updatedUser.surname,
			email: updatedUser.email
		}

		// Prepare session data with the embedded user snapshot
		const permissionConfig =
			mergedPermissions[AuthLoginUseCase.permission]?.config || {}
		const sessionData: SessionData = {
			user: sessionUser,
			permissions: mergedPermissions,
			sessionStartTime: currentTime.getTime(),
			lastActivity: currentTime.getTime(),
			maxSessionTime: permissionConfig.maxSessionTime || jwtExpiresInSeconds,
			maxInactiveTime: permissionConfig.maxInactiveTime || jwtExpiresInSeconds,
			config: permissionConfig
		}

		// 9. Save session to Redis
		// Use maxSessionTime as TTL for the Redis key
		await this.sessionRepository.save(
			sessionData.user.id,
			sessionData,
			sessionData.maxSessionTime || 60 * 60 * 8 // 8hs
		)

		// Generate JWT Token
		const jwtPayload: JwtUserPayload = {
			userId: updatedUser.id,
			organizationId: updatedUser.organizationId,
			roleId: updatedUser.roleId
		}

		const token = this.jwt.sign(jwtPayload, this.jwtSecret, {
			expiresIn: this.jwtExpiresIn as jwt.SignOptions['expiresIn']
		})

		// Prepare user data for response
		const userForOutput: UserLoginDetails = {
			id: updatedUser.id,
			organizationId: updatedUser.organizationId,
			email: updatedUser.email,
			name: updatedUser.name,
			surname: updatedUser.surname,
			roleId: updatedUser.roleId,
			active: updatedUser.active,
			config: updatedUser.config
		}

		//  Return the token and public user data
		return {
			data: {
				token,
				user: userForOutput
			},
			metadata: {
				attempts: job.getAttempts(),
				message: 'Login successful.'
			}
		}
	}
}
