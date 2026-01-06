import { Logger } from 'pino'
import { RepositoryManager } from '../../../core/repositoryManager'
import { DependencyContainer } from '../../../types/core/dependencyContainer'
import {
	Organization,
	OrganizationCreateInput,
	OrganizationUpdateInput
} from '../entities/Organization'
import { OrganizationRepository } from '../repository/OrganizationRepository'

describe('OrganizationRepository', () => {
	let repository: OrganizationRepository
	let dbMock: any
	let repositoryManagerMock: jest.Mocked<RepositoryManager>
	let loggerMock: jest.Mocked<Logger>
	let containerMock: DependencyContainer

	beforeEach(() => {
		dbMock = {
			organization: {
				findUnique: jest.fn(),
				findFirst: jest.fn(),
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

		containerMock = {
			repositoryManager: repositoryManagerMock,
			logger: loggerMock
		} as unknown as DependencyContainer

		// Use constructor injection instead of setContext
		repository = new OrganizationRepository(dbMock, containerMock)
	})

	it('should initialize repository and log info', () => {
		expect(loggerMock.info).toHaveBeenCalledWith(
			'Repository initialized: organization'
		)
	})

	it('should create a new organization', async () => {
		const input: OrganizationCreateInput = {
			name: 'Org1',
			email: 'a@b.com',
			phone: '123',
			address: 'Street 1'
		}
		const createdOrg: Organization = {
			...input,
			id: '1',
			createdAt: new Date(),
			updatedAt: new Date(),
			deletedAt: null
		} as any

		dbMock.organization.create.mockResolvedValue(createdOrg)

		const result = await repository.create(input)
		expect(dbMock.organization.create).toHaveBeenCalledWith({ data: input })
		expect(result).toEqual(createdOrg)
	})

	it('should update an existing organization', async () => {
		const updateData: OrganizationUpdateInput = { address: 'Updated Street' }
		const updatedOrg: Organization = {
			id: '1',
			name: 'Org1',
			email: 'a@b.com',
			phone: '123',
			address: 'Updated Street',
			timezone: 'UTC',
			scope: 'TENANT',
			config: {},
			createdAt: new Date(),
			updatedAt: new Date(),
			deletedAt: null
		}

		dbMock.organization.update.mockResolvedValue(updatedOrg)

		const result = await repository.update('1', updateData)
		expect(dbMock.organization.update).toHaveBeenCalledWith({
			where: { id: '1' },
			data: updateData
		})
		expect(result).toEqual(updatedOrg)
	})

	it('should return null if update returns null (unlikely in Prisma)', async () => {
		dbMock.organization.update.mockResolvedValue(null)
		const result = await repository.update('missing', { address: 'X' })
		expect(result).toBeNull()
	})

	it('should delete an organization and return true', async () => {
		dbMock.organization.update.mockResolvedValue({ id: '1' })
		const result = await repository.delete('1')
		expect(dbMock.organization.update).toHaveBeenCalledWith({
			where: { id: '1' },
			data: { deletedAt: expect.any(Date) },
			select: { id: true }
		})
		expect(result).toBe(true)
	})

	it('should return false if delete fails', async () => {
		dbMock.organization.update.mockResolvedValue(null)
		const result = await repository.delete('missing')
		expect(result).toBe(false)
	})

	it('should find organization by id', async () => {
		const org: Organization = {
			id: '1',
			name: 'Org1',
			email: 'a@b.com',
			phone: '123',
			address: 'Street 1',
			timezone: 'UTC',
			scope: 'TENANT',
			config: {},
			createdAt: new Date(),
			updatedAt: new Date(),
			deletedAt: null
		}
		dbMock.organization.findUnique.mockResolvedValue(org)

		const result = await repository.findById('1')
		expect(dbMock.organization.findUnique).toHaveBeenCalledWith({
			where: { id: '1', deletedAt: null }
		})
		expect(result).toEqual(org)
	})

	it('should return null if findById does not find anything', async () => {
		dbMock.organization.findUnique.mockResolvedValue(null)
		const result = await repository.findById('missing')
		expect(result).toBeNull()
	})

	it('should find organization by name', async () => {
		const org: Organization = {
			id: '1',
			name: 'Org1',
			email: 'a@b.com',
			phone: '123',
			address: 'Street 1',
			timezone: 'UTC',
			scope: 'TENANT',
			config: {},
			createdAt: new Date(),
			updatedAt: new Date(),
			deletedAt: null
		}
		dbMock.organization.findFirst.mockResolvedValue(org)

		const result = await repository.findByName('Org1')
		expect(dbMock.organization.findFirst).toHaveBeenCalledWith({
			where: { name: 'Org1', deletedAt: null }
		})
		expect(result).toEqual(org)
	})

	it('should return null if findByName does not find anything', async () => {
		dbMock.organization.findFirst.mockResolvedValue(null)
		const result = await repository.findByName('MissingOrg')
		expect(result).toBeNull()
	})

	it('should find all non-deleted organizations', async () => {
		const orgs: Organization[] = [
			{
				id: '1',
				name: 'Org1',
				email: 'a@b.com',
				phone: '123',
				address: 'Street 1',
				timezone: 'UTC',
				scope: 'TENANT',
				config: {},
				createdAt: new Date(),
				updatedAt: new Date(),
				deletedAt: null
			},
			{
				id: '2',
				name: 'Org2',
				email: 'b@b.com',
				phone: '456',
				address: 'Street 2',
				timezone: 'UTC',
				scope: 'TENANT',
				config: {},
				createdAt: new Date(),
				updatedAt: new Date(),
				deletedAt: null
			}
		]
		dbMock.organization.findMany.mockResolvedValue(orgs)

		const result = await repository.findAll()
		expect(dbMock.organization.findMany).toHaveBeenCalledWith({
			where: { deletedAt: null }
		})
		expect(result).toEqual(orgs)
	})
})
