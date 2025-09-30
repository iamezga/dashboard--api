import { DependencyContainer } from '@/core/dependencyContainer'
import { BadRequestError, UnauthorizedError } from '@/errors'
import { UseCase } from '@/lib/UseCase'
import {
	JwtUserPayload,
	LoginOutput,
	UserLoginDetails
} from '@/modules/auth/entities/AuthDataTypes'
import {
	SessionDataInput,
	SessionUser
} from '@/modules/session/entities/Session'
import { JobInterface } from '@/types/job/JobInterface'
import { UseCasePermissionValidationData } from '@/types/useCase/UseCasePermissionValidationData'
import { UseCaseResponseInterface } from '@/types/useCase/UseCaseResponseInterface'
import jwt from 'jsonwebtoken'
import { StringValue } from 'ms'
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

	constructor(container: DependencyContainer) {
		super(container)
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
					data.accessDay = container.libs.dayjs(meta.timestamp).format('dddd')
					schema.accessDay = {
						type: 'enum',
						values: config.conditions.accessDays.values
					}
				}
				if (config.conditions?.accessTime?.enabled) {
					data.accessTime = container.libs.dayjs(meta.timestamp).format('HH:mm')
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
		if (!this.container.config.get('jwt.secret')) {
			throw new Error('JWT SECRET is not defined')
		}
		if (!this.container.config.get('jwt.expiresIn')) {
			throw new Error('JWT EXPIRES IN is not defined')
		}

		const { email, password } = job.getData()

		const userRepository = this.container.repositoryManager.get('user')
		const roleRepository = this.container.repositoryManager.get('role')
		const sessionRepository = this.container.repositoryManager.get('session')

		// Find user authentication details
		const userAuthDetails = await userRepository.findUserAuthDetailsByEmail(
			email
		)

		// Check if user exists and is active
		if (
			!userAuthDetails ||
			!userAuthDetails.active ||
			userAuthDetails.deletedAt
		) {
			job.logger.warn(
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
		const passwordMatch = await this.container.libs.argon2.verify(
			userAuthDetails.passwordHash,
			password
		)
		if (!passwordMatch) {
			job.logger.warn(
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
			throw new UnauthorizedError('Authentication failed.')
		}

		const roleWithPermissions = await roleRepository.findByIdWithPermissions(
			userAuthDetails.roleId,
			userAuthDetails.organizationId
		)

		if (!roleWithPermissions || !roleWithPermissions.active) {
			throw new UnauthorizedError('Authentication failed.')
		}

		const rolePermissions = roleWithPermissions.rolePermissions.reduce(
			(acc, curr) => {
				if (!curr.permission.active || curr.permission.deletedAt) return acc
				const permission = this.container.utils.deepMerge(curr.permission, {
					config: curr.config
				})
				return (acc = { ...acc, [curr.permission.key]: permission })
			},
			<Record<string, any>>{}
		)
		const userPermissions = userAuthDetails.userPermissions.reduce(
			(acc, curr) => {
				if (!curr.permission.active || curr.permission.deletedAt) return acc
				const permission = this.container.utils.deepMerge(curr.permission, {
					config: curr.config
				})
				return (acc = { ...acc, [curr.permission.key]: permission })
			},
			<Record<string, any>>{}
		)

		const permissions = this.container.utils.deepMerge(
			rolePermissions,
			userPermissions
		)

		job.setUser({
			...userAuthDetails,
			permissions
		})

		const { data, schema } = await AuthLoginUseCase.getPermissionValidationData(
			job,
			this.container
		)
		const errors = await this.container.validator.validate(data, schema)
		if (errors.length) {
			throw new UnauthorizedError(
				`Authentication failed: Insufficient permissions.`
			)
		}

		const loginPermissionConfig =
			permissions[AuthLoginUseCase.permission]?.config || {}

		if (
			!loginPermissionConfig.allowMultipleSessions &&
			(await sessionRepository.hasActiveSessions(userAuthDetails.id))
		) {
			throw new UnauthorizedError(
				`Authentication failed: You have already logged in to another device.`
			)
		}

		const currentTime = new Date()

		// Update last login
		const updatedUser = await userRepository.update(userAuthDetails.id, {
			lastLogin: currentTime
		})
		if (!updatedUser) {
			throw new Error(
				`Failed to update last login for user: ${userAuthDetails.email}`
			)
		}
		const meta = job.getMeta()
		await this.container.services.auditService.record(
			'auth.login',
			job,
			'user', // resourceType
			updatedUser.id, // resourceId
			{ userAgent: meta.userAgent, loggedAt: currentTime } // payload
		)
		job.logger.info(`User ${userAuthDetails.email} successfully logged in.`)

		// Convert JWT expiresIn string (e.g., "1h") to seconds for Redis TTL
		const jwtExpiresInSeconds = this.container.utils.getTimeInSeconds(
			this.container.config.get('jwt.expiresIn') as StringValue
		)

		// Create the user snapshot for the session
		const sessionUser: SessionUser = {
			id: updatedUser.id,
			organizationId: updatedUser.organizationId,
			roleId: updatedUser.roleId,
			name: updatedUser.name,
			surname: updatedUser.surname,
			email: updatedUser.email,
			permissions
		}

		const sessionTTL =
			(loginPermissionConfig.maxSessionTime as number) || jwtExpiresInSeconds
		// Prepare session data with the embedded user snapshot
		const sessionData: SessionDataInput = {
			userId: updatedUser.id,
			sessionStartTime: currentTime.getTime(),
			lastActivity: currentTime.getTime(),
			maxSessionTime: sessionTTL,
			maxInactiveTime:
				(loginPermissionConfig.maxInactiveTime as number) || jwtExpiresInSeconds
		}
		await sessionRepository.saveUserData(
			updatedUser.id,
			sessionUser,
			sessionTTL
		)

		const sessionId = await sessionRepository.createSession(
			updatedUser.id,
			sessionData,
			sessionTTL
		)

		if (!sessionId) {
			throw new Error('Could not create user session in Redis.')
		}

		// Generate JWT Token
		const jwtPayload: JwtUserPayload = {
			sessionId,
			userId: updatedUser.id,
			organizationId: updatedUser.organizationId,
			roleId: updatedUser.roleId
		}

		const token = this.container.libs.jwt.sign(
			jwtPayload,
			this.container.config.get('jwt.secret'),
			{
				expiresIn: this.container.config.get(
					'jwt.expiresIn'
				) as jwt.SignOptions['expiresIn']
			}
		)

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
