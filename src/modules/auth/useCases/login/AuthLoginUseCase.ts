import { BadRequestError } from '@/errors'
import { UseCase } from '@/lib/UseCase'
import {
	SessionContext,
	SessionMetadataInput
} from '@/modules/session/entities/Session'
import { DependencyContainer } from '@/types/core/dependencyContainer'
import { JobInterface } from '@/types/job/JobInterface'
import { UseCasePermissionValidationData } from '@/types/useCase/UseCasePermissionValidationData'
import { UseCaseResponseInterface } from '@/types/useCase/UseCaseResponseInterface'
import {
	JwtUserPayload,
	LoginOutput,
	UserLoginDetails
} from '../../entities/AuthDataTypes'
import { AuthLoginJobInterface } from './AuthLoginJobInterface'

/**
 * @class AuthLoginUseCase
 * @description Login use case: authenticates, creates a session in Redis, and returns a small JWT token (userId, sessionId, exp). The full context (memberships, etc.) is stored in the session, not in the token.
 */
export class AuthLoginUseCase extends UseCase<AuthLoginJobInterface> {
	static readonly permission: string = 'auth.login'

	constructor(container: DependencyContainer) {
		super(container)
	}

	/**
	 * No permission validation needed for login, but we keep the method to comply with the interface
	 * and for potential future use (e.g., rate limiting based on user context).
	 *
	 * @param {JobInterface} job - The job object containing the user context and request metadata.
	 * @param {DependencyContainer} container - The application's dependency container.
	 * @returns {Promise<UseCasePermissionValidationData>} A promise that resolves to the schema and data for validation.
	 * @throws {UnauthorizedError} If timezones condition is enabled but X-Timezone header is missing.
	 */
	static async getPermissionValidationData(
		_job: JobInterface,
		_container: DependencyContainer
	): Promise<UseCasePermissionValidationData> {
		return { schema: {}, data: {} }
	}

	/**
	 * Authenticates user and password, creates session, and returns JWT token and basic user data.
	 * @param {AuthLoginJobInterface} job - The job with credentials.
	 * @returns {Promise<{ data: LoginOutput, metadata: any }>} Token and basic user data.
	 */
	public async run(
		job: AuthLoginJobInterface
	): Promise<UseCaseResponseInterface<LoginOutput>> {
		const { email, password } = job.getData()
		const userRepository = this.container.repositoryManager.get('user')
		const sessionRepository = this.container.repositoryManager.get('session')

		// Search user and memberships
		const rawUserAuthDetails =
			await userRepository.findUserAuthDetailsByEmail(email)
		if (!rawUserAuthDetails || rawUserAuthDetails.deletedAt) {
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
		// Verify password
		const passwordMatch = await this.container.libs.argon2.verify(
			rawUserAuthDetails.passwordHash,
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
		// Build session context and metadata
		const currentTime = new Date()
		const sessionContext: SessionContext = {
			user: {
				id: rawUserAuthDetails.id,
				email: rawUserAuthDetails.email,
				name: rawUserAuthDetails.name,
				surname: rawUserAuthDetails.surname,
				status: rawUserAuthDetails.status,
				config: rawUserAuthDetails.config || {},
				lastLogin: rawUserAuthDetails.lastLogin
			},
			memberships: rawUserAuthDetails.memberships || [],
			activeMembership: null
		}

		const sessionMetadata: SessionMetadataInput = {
			userId: rawUserAuthDetails.id,
			sessionStartTime: currentTime.getTime(),
			lastActivity: currentTime.getTime(),
			maxSessionTime: 0,
			maxInactiveTime: 0
		}
		// Session TTL
		const jwtExpiresInSeconds = this.container.utils.getTimeInSeconds(
			this.container.config.get('jwt.expiresIn') as string
		)
		const sessionTTL = jwtExpiresInSeconds
		sessionMetadata.maxSessionTime = sessionTTL
		sessionMetadata.maxInactiveTime = sessionTTL

		const sessionId = await sessionRepository.createSession(
			rawUserAuthDetails.id,
			sessionMetadata,
			sessionContext,
			sessionTTL
		)
		if (!sessionId) {
			throw new Error('Could not create user session in Redis.')
		}
		// Generate JWT
		const jwtPayload: JwtUserPayload = {
			userId: rawUserAuthDetails.id,
			sessionId
		}
		const token = this.container.libs.jwt.sign(
			jwtPayload,
			this.container.config.get('jwt.secret'),
			{ expiresIn: sessionTTL }
		)

		// Hydrate Job context as authenticated flow so downstream middleware audits
		// can use actor/session information consistently in this special login path.
		job.setUser({
			id: rawUserAuthDetails.id,
			email: rawUserAuthDetails.email,
			name: rawUserAuthDetails.name,
			surname: rawUserAuthDetails.surname,
			status: rawUserAuthDetails.status,
			config: rawUserAuthDetails.config || {},
			lastLogin: rawUserAuthDetails.lastLogin,
			createdAt: rawUserAuthDetails.createdAt,
			updatedAt: rawUserAuthDetails.updatedAt,
			deletedAt: rawUserAuthDetails.deletedAt,
			memberships: rawUserAuthDetails.memberships || [],
			membership: undefined
		})
		job.updateMeta({ sessionId })

		// Log successful login and audit
		const meta = job.getMeta()
		await this.container.services.auditService.record(
			'auth.login',
			job,
			'session',
			sessionId,
			{ userAgent: meta.userAgent, loggedAt: currentTime },
			{
				userId: rawUserAuthDetails.id,
				userEmail: rawUserAuthDetails.email,
				sessionId
			}
		)
		job.logger.info(`User ${rawUserAuthDetails.email} successfully logged in.`)
		// Prepare basic response
		const userForOutput: UserLoginDetails = {
			id: rawUserAuthDetails.id,
			email: rawUserAuthDetails.email,
			name: rawUserAuthDetails.name,
			surname: rawUserAuthDetails.surname,
			status: rawUserAuthDetails.status,
			memberships: rawUserAuthDetails.memberships || [],
			config: rawUserAuthDetails.config || {}
		}

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
