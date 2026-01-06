import { BadRequestError, UnauthorizedError } from '@/errors'
import { UseCase } from '@/lib/UseCase'
import {
	JwtUserPayload,
	LoginOutput,
	UserAuthDetails,
	UserLoginDetails
} from '@/modules/auth/entities/AuthDataTypes'
import {
	SessionDataInput,
	SessionUser
} from '@/modules/session/entities/Session'
import { DependencyContainer } from '@/types/core/dependencyContainer'
import { JobInterface } from '@/types/job/JobInterface'
import { UseCasePermissionValidationData } from '@/types/useCase/UseCasePermissionValidationData'
import { UseCaseResponseInterface } from '@/types/useCase/UseCaseResponseInterface'
import jwt from 'jsonwebtoken'
import { StringValue } from 'ms'
import { AuthLoginJobInterface } from './AuthLoginJobInterface'

/**
 * @class AuthLoginUseCase
 * @description Handles the user authentication (login) process with advanced permission controls.
 *
 * Use Case Flow:
 * 1. Validate user credentials (email + password)
 * 2. Check user exists, is active, and not deleted
 * 3. Verify password using argon2
 * 4. Validate permission-based access conditions (if configured):
 *    - Timezones: Restrict login to specific geographic locations (requires X-Timezone header)
 *    - Access days: Restrict login to specific days of the week
 *    - Access time: Restrict login to specific time windows (evaluated in organization timezone)
 * 5. Load user's complete role and permissions
 * 6. Generate JWT token with user payload
 * 7. Create session in Redis with expiration
 * 8. Log audit event
 * 9. Return token and user details
 *
 * Security Features:
 * - Password verification with argon2
 * - Geographic access control via timezone validation (X-Timezone header)
 * - Configurable day/time access restrictions per permission
 * - Session management with Redis
 * - Audit logging for all login attempts
 * - Multi-tenancy isolation
 * - Context-aware error messages (detailed in dev, generic in production)
 *
 * @permission auth.login
 */
export class AuthLoginUseCase extends UseCase<AuthLoginJobInterface> {
	static readonly permission: string = 'auth.login'

	constructor(container: DependencyContainer) {
		super(container)
	}

	/**
	 * Provides the validation schema and data for the `auth.login` permission check.
	 * It dynamically generates the schema based on the permission config, including:
	 * - Timezones validation (requires X-Timezone header from client)
	 * - Access days validation (day of the week)
	 * - Access time validation (time windows in organization timezone)
	 *
	 * @param {JobInterface} job - The job object containing the user context and request metadata.
	 * @param {DependencyContainer} container - The application's dependency container.
	 * @returns {Promise<UseCasePermissionValidationData>} A promise that resolves to the schema and data for validation.
	 * @throws {UnauthorizedError} If timezones condition is enabled but X-Timezone header is missing.
	 */
	static async getPermissionValidationData(
		job: JobInterface,
		container: DependencyContainer
	): Promise<UseCasePermissionValidationData> {
		const permissions = job.getUser().permissions
		const meta = job.getMeta()

		const { schema, data } = this.buildPermissionSchema(this.permission, job)

		if (permissions[AuthLoginUseCase.permission]) {
			const { config } = permissions[AuthLoginUseCase.permission]
			if (config.conditions) {
				// Validate client's timezone (geographic restriction)
				if (config.conditions?.timezones?.enabled) {
					const clientTimezone = meta.timezone

					// If timezones validation is enabled, timezone header is required
					if (!clientTimezone) {
						const isDev = container.config.get('env') !== 'production'
						const message = isDev
							? 'Authentication failed: X-Timezone header is required for geographic access control.'
							: 'Authentication failed: Insufficient permissions.'

						throw new UnauthorizedError(message)
					}

					data.timezone = clientTimezone
					schema.timezone = {
						type: 'enum',
						values: config.conditions.timezones.values
					}
				}
				if (config.conditions?.accessDays?.enabled) {
					data.accessDay = container.libs.dayjs(meta.timestamp).format('dddd')
					schema.accessDay = {
						type: 'enum',
						values: config.conditions.accessDays.values
					}
				}
				if (config.conditions?.accessTime?.enabled) {
					const organization = job.getUser().organization
					const orgTimezone = organization.timezone
					data.accessTime = container.libs
						.dayjs(meta.timestamp)
						.tz(orgTimezone)
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
	 * Filters user permissions applying business rules.
	 * Removes inactive, disabled, or deleted permissions.
	 * This is application-layer logic, separate from repository mapping.
	 *
	 * @param rawUserAuthDetails - Raw user data from repository (unfiltered)
	 * @returns User data with filtered permissions, or null if input is null
	 */
	private static filterActivePermissions(
		rawUserAuthDetails: UserAuthDetails | null
	): UserAuthDetails | null {
		if (!rawUserAuthDetails) return null

		// If no userPermissions array, return as-is (edge case for incomplete data)
		if (!rawUserAuthDetails.userPermissions) {
			return rawUserAuthDetails
		}

		return {
			...rawUserAuthDetails,
			userPermissions: rawUserAuthDetails.userPermissions.filter(
				up =>
					!up.permission.deletedAt &&
					!up.disabled &&
					up.permission.active &&
					!up.deletedAt
			)
		}
	}

	/**
	 * Executes the user login business logic.
	 * @param {AuthLoginJobInterface} job - The Job object containing the login credentials.
	 * @returns {Promise<UseCaseResponseInterface<LoginOutput>>} A promise that resolves with the authentication token and public user data.
	 * @throws {BadRequestError} If credentials are incorrect, the user is inactive, or the password is invalid.
	 * @throws {UnauthorizedError} If the user's role is invalid/inactive, or if login authorization rules (e.g., timezone/geographic, time/day restrictions) are not met.
	 * @throws {Error} For unexpected internal errors.
	 */
	public async run(
		job: AuthLoginJobInterface
	): Promise<UseCaseResponseInterface<LoginOutput>> {
		const { email, password } = job.getData()

		const userRepository = this.container.repositoryManager.get('user')
		const roleRepository = this.container.repositoryManager.get('role')
		const sessionRepository = this.container.repositoryManager.get('session')

		// Find user authentication details and apply business rules
		const rawUserAuthDetails = await userRepository.findUserAuthDetailsByEmail(
			email
		)
		const userAuthDetails =
			AuthLoginUseCase.filterActivePermissions(rawUserAuthDetails)

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
		// userPermissions are already filtered by filterActivePermissions (active & not deleted)
		const userPermissions = userAuthDetails.userPermissions.reduce(
			(acc, curr) => {
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

		// Determine session TTL: use permission config maxSessionTime if available, otherwise use JWT default
		const sessionTTL =
			(loginPermissionConfig.maxSessionTime as number) || jwtExpiresInSeconds

		// Create the user snapshot for the session
		const sessionUser: SessionUser = {
			id: updatedUser.id,
			organizationId: updatedUser.organizationId,
			roleId: updatedUser.roleId,
			name: updatedUser.name,
			surname: updatedUser.surname,
			email: updatedUser.email,
			permissions,
			organization: userAuthDetails.organization
		}
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

		// Generate JWT Token with dynamic expiration based on permission config
		const jwtPayload: JwtUserPayload = {
			sessionId,
			userId: updatedUser.id,
			organizationId: updatedUser.organizationId,
			roleId: updatedUser.roleId
		}

		// Use maxSessionTime from permission config if available, otherwise use default from env
		const jwtExpiresIn = loginPermissionConfig.maxSessionTime
			? (loginPermissionConfig.maxSessionTime as number) // JWT accepts seconds as number
			: (this.container.config.get(
					'jwt.expiresIn'
			  ) as jwt.SignOptions['expiresIn'])

		const token = this.container.libs.jwt.sign(
			jwtPayload,
			this.container.config.get('jwt.secret'),
			{ expiresIn: jwtExpiresIn }
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
