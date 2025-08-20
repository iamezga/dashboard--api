import { BadRequestError } from '@/errors'
import { UseCase } from '@/lib/UseCase'
import {
	LoginOutput,
	UserLoginDetails
} from '@/modules/auth/entities/AuthDataTypes'
import { UserRepositoryInterface } from '@/modules/user/entities/UserRepositoryInterface'
import { DependencyContainer } from '@/services/dependencyContainer'
import { UseCaseResponseInterface } from '@/types/useCase/UseCaseResponseInterface'
import { verify } from 'argon2'
import jwt from 'jsonwebtoken'

import { AuthLoginJobInterface } from './AuthLoginJobInterface'

/**
 * @class AuthLoginUseCase
 * @description Handles the user authentication (login) process.
 * It verifies user credentials and generates a JWT token upon successful authentication,
 * leveraging the UserRepository for data access.
 * @permission auth.login
 */
export class AuthLoginUseCase extends UseCase<AuthLoginJobInterface> {
	private userRepository: UserRepositoryInterface

	private jwt: typeof jwt
	private jwtSecret: string
	private jwtExpiresIn: string
	private argon2Verify: typeof verify

	constructor(container: DependencyContainer) {
		super(container)
		this.userRepository = container.repositories.user
		this.jwt = container.thirdParties.jwt
		this.jwtSecret = container.config.get('jwt.secret')
		this.jwtExpiresIn = container.config.get('jwt.expiresIn')
		this.argon2Verify = container.thirdParties.argon2.verify

		if (!this.jwtSecret) {
			throw new Error('JWT SECRET is not defined')
		}
		if (!this.jwtExpiresIn) {
			throw new Error('JWT EXPIRES IN is not defined')
		}
	}

	/**
	 * Executes the user login business logic.
	 * @param {AuthLoginJobInterface} job - The Job object containing login credentials.
	 * @returns {Promise<UseCaseResponseInterface<LoginOutput>>}
	 * @throws {BadRequestError} If credentials are invalid or the user is inactive.
	 * @throws {Error} For unexpected internal errors (e.g., missing JWT secret or failed user update).
	 */
	public async run(
		job: AuthLoginJobInterface
	): Promise<UseCaseResponseInterface<LoginOutput>> {
		const { email, password } = job.getData()

		// Find user authentication details
		const userAuthDetails =
			await this.container.repositories.user.findUserAuthDetailsByEmail(email)

		// Check if user exists and is active
		if (!userAuthDetails || !userAuthDetails.active) {
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

		// Update last login
		const updatedUser = await this.userRepository.update(userAuthDetails.id, {
			lastLogin: new Date()
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

		// Generate JWT Token
		const jwtPayload = {
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
