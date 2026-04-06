import { BadRequestError } from '../../../../errors/BadRequestError'
import { DependencyContainer } from '../../../../types/core/dependencyContainer'
import { AuthLoginUseCase } from './AuthLoginUseCase'

describe('AuthLoginUseCase', () => {
	const userRepo = { findUserAuthDetailsByEmail: jest.fn() }
	const sessionRepo = { createSession: jest.fn() }
	const argon2 = { verify: jest.fn() }
	const jwt = { sign: jest.fn() }
	const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
	const auditService = { record: jest.fn() }
	const utilsGetTimeInSeconds = jest.fn()

	const makeContainer = (): DependencyContainer =>
		({
			repositoryManager: {
				get: (name: string) => {
					if (name === 'user') return userRepo
					if (name === 'session') return sessionRepo
					throw new Error(`Repo ${name} not mocked`)
				}
			},
			libs: { argon2, jwt },
			services: { auditService },
			utils: { getTimeInSeconds: utilsGetTimeInSeconds },
			config: {
				get: (key: string) => {
					if (key === 'jwt.expiresIn') return '24h'
					if (key === 'jwt.secret') return 'secret'
					return undefined
				}
			},
			logger
		}) as unknown as DependencyContainer

	const makeJob = (data: any) =>
		({
			getData: () => data,
			getMeta: () => ({ timestamp: new Date(), userAgent: 'agent' }),
			getUser: () => ({}),
			setUser: jest.fn(),
			updateMeta: jest.fn(),
			getAttempts: () => 1,
			logger
		}) as any

	beforeEach(() => {
		jest.clearAllMocks()
		sessionRepo.createSession.mockResolvedValueOnce('session-id-123')
		jwt.sign.mockReturnValueOnce('token-jwt')
		utilsGetTimeInSeconds.mockReturnValueOnce(86400)
		auditService.record.mockResolvedValueOnce(undefined)
	})

	it('should return empty permission validation data', async () => {
		const result = await AuthLoginUseCase.getPermissionValidationData(
			{} as any,
			{} as any
		)

		expect(result).toEqual({
			data: {},
			schema: {}
		})
	})

	it('should throw BadRequestError for non-existent user', async () => {
		userRepo.findUserAuthDetailsByEmail.mockResolvedValueOnce(null)
		const useCase = new AuthLoginUseCase(makeContainer())
		await expect(
			useCase.run(makeJob({ email: 'nouser@mail.com', password: '123' }))
		).rejects.toBeInstanceOf(BadRequestError)
	})

	it('should throw BadRequestError for deleted user', async () => {
		userRepo.findUserAuthDetailsByEmail.mockResolvedValueOnce({
			id: 'u2',
			email: 'user@mail.com',
			passwordHash: 'hash',
			deletedAt: new Date(),
			name: 'Test',
			surname: 'User',
			status: 'active',
			config: {},
			memberships: [],
			lastLogin: null,
			createdAt: new Date(),
			updatedAt: new Date()
		})
		const useCase = new AuthLoginUseCase(makeContainer())
		await expect(
			useCase.run(makeJob({ email: 'user@mail.com', password: '123' }))
		).rejects.toBeInstanceOf(BadRequestError)
	})

	it('should throw BadRequestError for invalid password', async () => {
		userRepo.findUserAuthDetailsByEmail.mockResolvedValueOnce({
			id: 'u1',
			email: 'user@mail.com',
			passwordHash: 'hash',
			deletedAt: null,
			name: 'John',
			surname: 'Doe',
			status: 'active',
			config: {},
			memberships: [],
			lastLogin: null,
			createdAt: new Date(),
			updatedAt: new Date()
		})
		argon2.verify.mockResolvedValueOnce(false)
		const useCase = new AuthLoginUseCase(makeContainer())
		await expect(
			useCase.run(makeJob({ email: 'user@mail.com', password: 'wrong' }))
		).rejects.toBeInstanceOf(BadRequestError)
	})

	it('should return active memberships after successful login', async () => {
		const userData = {
			id: 'u1',
			email: 'user@mail.com',
			passwordHash: 'hash',
			deletedAt: null,
			name: 'John',
			surname: 'Doe',
			status: 'active',
			config: {},
			lastLogin: null,
			createdAt: new Date(),
			updatedAt: new Date(),
			memberships: [
				{
					id: 'm1',
					organization: {
						id: 'org1',
						name: 'Org 1',
						timezone: 'UTC',
						scope: 'TENANT'
					},
					role: { id: 'r1', name: 'Role 1', label: 'Admin', scope: 'TENANT' },
					status: 'active',
					isOwner: false,
					deletedAt: null
				},
				{
					id: 'm2',
					organization: {
						id: 'org2',
						name: 'Org 2',
						timezone: 'UTC',
						scope: 'TENANT'
					},
					role: { id: 'r2', name: 'Role 2', label: 'User', scope: 'TENANT' },
					status: 'pending',
					isOwner: false,
					deletedAt: null
				},
				{
					id: 'm3',
					organization: {
						id: 'org3',
						name: 'Org 3',
						timezone: 'UTC',
						scope: 'TENANT'
					},
					role: { id: 'r3', name: 'Role 3', label: 'Guest', scope: 'TENANT' },
					status: 'active',
					isOwner: true,
					deletedAt: new Date()
				}
			]
		}
		userRepo.findUserAuthDetailsByEmail.mockResolvedValueOnce(userData)
		argon2.verify.mockResolvedValueOnce(true)
		const useCase = new AuthLoginUseCase(makeContainer())
		const result = await useCase.run(
			makeJob({ email: 'user@mail.com', password: '123' })
		)
		expect(result.data.user.memberships).toHaveLength(3)
		expect(result.data.user.memberships[0]).toMatchObject({
			id: 'm1',
			organization: {
				id: 'org1',
				name: 'Org 1',
				timezone: 'UTC',
				scope: 'TENANT'
			},
			role: { id: 'r1', name: 'Role 1', label: 'Admin', scope: 'TENANT' },
			status: 'active',
			isOwner: false
		})
		expect(result.data.user).toMatchObject({
			id: 'u1',
			email: 'user@mail.com',
			name: 'John',
			surname: 'Doe',
			status: 'active',
			config: {}
		})
		expect(result.data).toHaveProperty('token')
		expect(result.data.token).toBe('token-jwt')
	})

	it('should return empty memberships after successful login', async () => {
		const userData = {
			id: 'u1',
			email: 'user@mail.com',
			passwordHash: 'hash',
			deletedAt: null,
			name: 'John',
			surname: 'Doe',
			status: 'active',
			config: {},
			memberships: null,
			lastLogin: null,
			createdAt: new Date(),
			updatedAt: new Date()
		}
		userRepo.findUserAuthDetailsByEmail.mockResolvedValueOnce(userData)
		argon2.verify.mockResolvedValueOnce(true)
		const useCase = new AuthLoginUseCase(makeContainer())
		const result = await useCase.run(
			makeJob({ email: 'user@mail.com', password: '123' })
		)
		expect(result.data.user.memberships).toHaveLength(0)
		expect(result.data.user).toMatchObject({
			id: 'u1',
			email: 'user@mail.com',
			name: 'John',
			surname: 'Doe',
			status: 'active',
			config: {},
			memberships: []
		})
		expect(result.data).toHaveProperty('token')
		expect(result.data.token).toBe('token-jwt')
	})
})
