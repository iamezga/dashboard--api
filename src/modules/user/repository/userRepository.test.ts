import { User as PrismaUserModel } from '@prisma/client'
import { Logger } from 'pino'
import { DependencyContainer } from '../../../core/dependencyContainer'
import { RepositoryManager } from '../../../core/repositoryManager'
import { UserAuthDetails } from '../../auth/entities/AuthDataTypes'
import { UserCreateInput, UserStatus, UserUpdateInput } from '../entities/User'
import { UserRepository } from '../repository/UserRepository'

describe('UserRepository', () => {
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

		repository = new UserRepository(dbMock)
		repository.setContext(containerMock)
	})

	afterEach(() => {
		jest.restoreAllMocks()
	})

	it('should return user mapped from Prisma in findById', async () => {
		const prismaUser: PrismaUserModel = {
			id: '1',
			organizationId: 'org1',
			name: 'John',
			surname: 'Doe',
			email: 'john@example.com',
			roleId: 'role1',
			active: true,
			lastLogin: new Date(),
			config: {},
			createdAt: new Date(),
			updatedAt: new Date(),
			deletedAt: null,
			passwordHash: 'hash'
		} as any

		dbMock.user.findUnique.mockResolvedValue(prismaUser)

		const result = await repository.findById('1')

		expect(dbMock.user.findUnique).toHaveBeenCalledWith({ where: { id: '1' } })
		expect(result).toMatchObject({
			id: '1',
			email: 'john@example.com',
			active: true
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
			organizationId: 'org1',
			name: 'Alice',
			surname: 'Smith',
			email: 'alice@example.com',
			roleId: 'role2',
			active: true,
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
			where: { email: 'alice@example.com' }
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
			organizationId: 'org2',
			email: 'bob@example.com',
			passwordHash: 'hash',
			active: true,
			name: 'Bob',
			surname: 'Builder',
			roleId: 'role3',
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
			where: { email: 'bob@example.com' },
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
			active: true,
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
		expect(result?.active).toBe(true)
	})

	it('should create a new user', async () => {
		const input: UserCreateInput = {
			organizationId: 'org1',
			name: 'Alice',
			surname: 'Smith',
			email: 'alice@example.com',
			roleId: 'role2',
			active: true,
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

		expect(dbMock.user.create).toHaveBeenCalledWith({ data: input })
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

	it('should return null when update does not find a user', async () => {
		dbMock.user.update.mockResolvedValue(null)
		const result = await repository.update('missing', { name: 'X' })
		expect(result).toBeNull()
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
				organizationId: 'org1',
				name: 'John',
				surname: 'Doe',
				email: 'john@example.com',
				roleId: 'role1',
				active: true,
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

	it('should exclude permissions when deletedAt, disabled or inactive', async () => {
		const prismaUser = {
			id: '40',
			organizationId: 'orgX',
			email: 'filter2@example.com',
			passwordHash: 'hash',
			active: true,
			name: 'Filter2',
			surname: 'User',
			roleId: 'roleX',
			config: {},
			lastLogin: null,
			createdAt: new Date(),
			updatedAt: new Date(),
			deletedAt: null,
			userPermissions: [
				{
					assignedAt: new Date(),
					disabled: false,
					deletedAt: null,
					config: {},
					permission: {
						id: 'del1',
						key: 'DEL',
						active: true,
						deletedAt: new Date(),
						scope: 'GLOBAL',
						config: {}
					}
				},
				{
					assignedAt: new Date(),
					disabled: true,
					deletedAt: null,
					config: {},
					permission: {
						id: 'dis1',
						key: 'DIS',
						active: true,
						deletedAt: null,
						scope: 'GLOBAL',
						config: {}
					}
				},
				{
					assignedAt: new Date(),
					disabled: false,
					deletedAt: null,
					config: {},
					permission: {
						id: 'ina1',
						key: 'INA',
						active: false,
						deletedAt: null,
						scope: 'GLOBAL',
						config: {}
					}
				},
				{
					assignedAt: new Date(),
					disabled: false,
					deletedAt: null,
					config: {},
					permission: {
						id: 'ok1',
						key: 'OK',
						active: true,
						deletedAt: null,
						scope: 'GLOBAL',
						config: {}
					}
				}
			]
		} as any

		;(dbMock.user!.findUnique as jest.Mock).mockResolvedValue(prismaUser)

		const result = await repository.findUserAuthDetailsByEmail(
			'filter2@example.com'
		)

		expect(result?.userPermissions.map((p: any) => p.permission.key)).toEqual([
			'OK'
		])
	})

	it('should return null if findStatusById does not find a user', async () => {
		;(dbMock.user!.findUnique as jest.Mock).mockResolvedValue(null)

		const result = await repository.findStatusById('unknown-id')

		expect(dbMock.user!.findUnique).toHaveBeenCalledWith({
			where: { id: 'unknown-id' },
			select: {
				active: true,
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
