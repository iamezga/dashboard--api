import { Logger } from 'pino'
import { RepositoryManager } from '../../../core/repositoryManager'
import { User as PrismaUserModel } from '../../../generated/prisma/client'
import { DependencyContainer } from '../../../types/core/dependencyContainer'
import { UserAuthDetails } from '../../auth/entities/AuthDataTypes'
import { UserCreateInput, UserStatus, UserUpdateInput } from '../entities/User'
import { UserRepository } from '../repository/UserRepository'

describe('UserRepository', () => {
	it('should find user by id for a specific organization', async () => {
		dbMock.member = {
			findFirst: jest.fn()
		}
		const memberUser = {
			id: '30',
			name: 'OrgIdUser',
			surname: 'Org',
			email: 'orgiduser@example.com',
			status: 'active',
			lastLogin: null,
			config: {},
			createdAt: new Date(),
			updatedAt: new Date(),
			deletedAt: null,
			passwordHash: 'hash'
		}
		dbMock.member.findFirst.mockResolvedValue({ user: memberUser })
	})
	it('should find all users for a specific organization', async () => {
		dbMock.member = {
			findMany: jest.fn()
		}
		const memberUser = {
			id: '10',
			name: 'OrgUser',
			surname: 'Org',
			email: 'orguser@example.com',
			status: 'active',
			lastLogin: null,
			config: {},
			createdAt: new Date(),
			updatedAt: new Date(),
			deletedAt: null,
			passwordHash: 'hash'
		}
		dbMock.member.findMany.mockResolvedValue([{ user: memberUser }])
	})

	it('should find user by email for a specific organization', async () => {
		dbMock.member = {
			findFirst: jest.fn()
		}
		const memberUser = {
			id: '20',
			name: 'OrgEmail',
			surname: 'Org',
			email: 'orgemail@example.com',
			status: 'active',
			lastLogin: null,
			config: {},
			createdAt: new Date(),
			updatedAt: new Date(),
			deletedAt: null,
			passwordHash: 'hash'
		}
		dbMock.member.findFirst.mockResolvedValue({ user: memberUser })
	})
	// Tests de membresía eliminados: ahora corresponden a MembershipRepository
	let repository: UserRepository
	let dbMock: any
	let repositoryManagerMock: jest.Mocked<RepositoryManager>
	let loggerMock: jest.Mocked<Logger>

	beforeEach(() => {
		dbMock = {
			user: {
				findUnique: jest.fn(),
				findMany: jest.fn(),
				create: jest.fn(),
				update: jest.fn()
			}
		}

		repositoryManagerMock = {
			getUserRepository: jest.fn(),
			getSessionRepository: jest.fn(),
			getPermissionRepository: jest.fn(),
			getRoleRepository: jest.fn()
		} as unknown as jest.Mocked<RepositoryManager>
		loggerMock = {
			info: jest.fn(),
			error: jest.fn(),
			warn: jest.fn(),
			debug: jest.fn()
		} as any
		const containerMock = {
			repositoryManager: repositoryManagerMock,
			logger: loggerMock
		} as unknown as DependencyContainer

		// Use constructor injection instead of setContext
		repository = new UserRepository(dbMock, containerMock)
	})

	afterEach(() => {
		jest.restoreAllMocks()
	})

	it('should return user mapped from Prisma in findById', async () => {
		const prismaUser: PrismaUserModel = {
			id: '1',
			name: 'John',
			surname: 'Doe',
			email: 'john@example.com',
			status: 'active',
			lastLogin: new Date(),
			config: {},
			createdAt: new Date(),
			updatedAt: new Date(),
			deletedAt: null,
			passwordHash: 'hash'
		} as any

		dbMock.user.findUnique.mockResolvedValue(prismaUser)

		const result = await repository.findById('1')

		expect(dbMock.user.findUnique).toHaveBeenCalledWith({
			where: {
				id: '1',
				deletedAt: null
			}
		})
		expect(result).toMatchObject({
			id: '1',
			email: 'john@example.com',
			status: 'active'
		})
	})

	it('should return null if user not found in findById', async () => {
		dbMock.user.findUnique.mockResolvedValue(null)
		const result = await repository.findById('1')
		expect(result).toBeNull()
	})

	it('should find user by email', async () => {
		const prismaUser: PrismaUserModel = {
			id: '2',
			name: 'Alice',
			surname: 'Smith',
			email: 'alice@example.com',
			status: 'active',
			lastLogin: null,
			config: {},
			createdAt: new Date(),
			updatedAt: new Date(),
			deletedAt: null,
			passwordHash: 'hash'
		} as any

		dbMock.user.findUnique.mockResolvedValue(prismaUser)

		const result = await repository.findByEmail('alice@example.com')
		expect(dbMock.user.findUnique).toHaveBeenCalledWith({
			where: {
				email: 'alice@example.com'
			}
		})
		expect(result?.email).toBe('alice@example.com')
	})

	it('should return null for findByEmail if not found', async () => {
		dbMock.user.findUnique.mockResolvedValue(null)
		const result = await repository.findByEmail('missing@example.com')
		expect(result).toBeNull()
	})

	it('should return UserAuthDetails for findUserAuthDetailsByEmail', async () => {
		const prismaUser = {
			id: '3',
			email: 'bob@example.com',
			passwordHash: 'hash',
			status: 'active',
			name: 'Bob',
			surname: 'Builder',
			config: {},
			lastLogin: null,
			createdAt: new Date(),
			updatedAt: new Date(),
			deletedAt: null,
			userPermissions: []
		}

		dbMock.user.findUnique.mockResolvedValue(prismaUser)

		const result: UserAuthDetails | null =
			await repository.findUserAuthDetailsByEmail('bob@example.com')

		expect(dbMock.user.findUnique).toHaveBeenCalledWith({
			where: {
				email: 'bob@example.com'
			},
			include: expect.any(Object)
		})
		expect(result?.email).toBe('bob@example.com')
	})

	it('should return null for findUserAuthDetailsByEmail if not found', async () => {
		dbMock.user.findUnique.mockResolvedValue(null)
		const result = await repository.findUserAuthDetailsByEmail(
			'notfound@example.com'
		)
		expect(result).toBeNull()
	})

	it('should return UserStatus for findStatusById', async () => {
		const prismaStatus = {
			status: 'active',
			lastLogin: null,
			config: {},
			createdAt: new Date(),
			updatedAt: new Date(),
			deletedAt: null
		}

		dbMock.user.findUnique.mockResolvedValue(prismaStatus)

		const result: UserStatus | null = await repository.findStatusById('5')
		expect(dbMock.user.findUnique).toHaveBeenCalledWith({
			where: { id: '5' },
			select: expect.any(Object)
		})
		expect(result?.status).toBe('active')
	})

	it('should create a new user', async () => {
		const input: UserCreateInput = {
			name: 'Alice',
			surname: 'Smith',
			email: 'alice@example.com',
			status: 'active',
			config: {},
			passwordHash: 'pass'
		}

		const prismaUser = {
			...input,
			id: '2',
			createdAt: new Date(),
			updatedAt: new Date()
		}

		dbMock.user.create.mockResolvedValue(prismaUser)

		const result = await repository.create(input)

		expect(dbMock.user.create).toHaveBeenCalledWith({
			data: input
		})
		expect(result.id).toBe('2')
	})

	it('should update a user', async () => {
		const updateData: UserUpdateInput = { name: 'Alice Updated' }
		const prismaUser = { id: '2', ...updateData }

		dbMock.user.update.mockResolvedValue(prismaUser)

		const result = await repository.update('2', updateData)

		expect(dbMock.user.update).toHaveBeenCalledWith({
			where: { id: '2' },
			data: updateData
		})
		expect(result?.name).toBe('Alice Updated')
	})

	it('should delete a user (soft delete)', async () => {
		dbMock.user.update.mockResolvedValue({ id: '2' })
		const result = await repository.delete('2')
		expect(dbMock.user.update).toHaveBeenCalledWith({
			where: { id: '2' },
			data: { deletedAt: expect.any(Date) },
			select: { id: true }
		})
		expect(result).toBe(true)
	})

	it('should return false when delete does not find a user', async () => {
		dbMock.user.update.mockResolvedValue(null)
		const result = await repository.delete('missing')
		expect(result).toBe(false)
	})

	it('should find all active users', async () => {
		const prismaUsers: PrismaUserModel[] = [
			{
				id: '1',
				name: 'John',
				surname: 'Doe',
				email: 'john@example.com',
				status: 'active',
				lastLogin: new Date(),
				config: {},
				createdAt: new Date(),
				updatedAt: new Date(),
				deletedAt: null,
				passwordHash: 'hash'
			} as any
		]

		dbMock.user.findMany.mockResolvedValue(prismaUsers)

		const result = await repository.findAll()

		expect(dbMock.user.findMany).toHaveBeenCalledWith({
			where: { deletedAt: null }
		})
		expect(result).toHaveLength(1)
		expect(result[0].id).toBe('1')
	})

	it('should return null if findStatusById does not find a user', async () => {
		;(dbMock.user!.findUnique as jest.Mock).mockResolvedValue(null)

		const result = await repository.findStatusById('unknown-id')

		expect(dbMock.user!.findUnique).toHaveBeenCalledWith({
			where: { id: 'unknown-id' },
			select: {
				status: true,
				lastLogin: true,
				config: true,
				createdAt: true,
				updatedAt: true,
				deletedAt: true
			}
		})
		expect(result).toBeNull()
	})
})
