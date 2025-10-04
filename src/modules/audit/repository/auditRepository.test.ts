import { Collection } from 'mongodb'
import { Logger } from 'pino'
import { RepositoryManager } from '../../../core/repositoryManager'
import { DependencyContainer } from '../../../types/core/dependencyContainer'
import { Audit, AuditInput } from '../entities/Audit'
import { AuditRepository } from '../repository/AuditRepository'

describe('AuditRepository', () => {
	let repository: AuditRepository
	let dbMock: any
	let collectionMock: jest.Mocked<Collection<Audit>>
	let repositoryManagerMock: jest.Mocked<RepositoryManager>
	let loggerMock: jest.Mocked<Logger>
	let containerMock: DependencyContainer

	beforeEach(() => {
		collectionMock = {
			insertOne: jest.fn()
		} as any

		dbMock = {
			collection: jest.fn().mockReturnValue(collectionMock)
		}

		repositoryManagerMock = {
			getUserRepository: jest.fn(),
			getSessionRepository: jest.fn(),
			getPermissionRepository: jest.fn(),
			getRoleRepository: jest.fn()
		} as unknown as jest.Mocked<RepositoryManager>

		loggerMock = {
			error: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			debug: jest.fn()
		} as any

		containerMock = {
			repositoryManager: repositoryManagerMock,
			logger: loggerMock
		} as unknown as DependencyContainer

		repository = new AuditRepository(dbMock)
		repository.setContext(containerMock)
	})

	it('should cover getCustomContainer return and call insertOne successfully', async () => {
		const auditInput: AuditInput = {
			action: 'CREATE' as any,
			jobId: 'job123',
			timestamp: new Date(),
			user: {
				userId: 'u1',
				userEmail: 'user@example.com',
				organizationId: 'org1',
				roleId: 'role1'
			},
			resource: {
				resourceType: 'User',
				resourceId: '123'
			},
			payload: { extra: 'data' },
			ip: '127.0.0.1'
		}

		await repository.insert(auditInput)

		expect(collectionMock.insertOne).toHaveBeenCalledWith(auditInput)
	})

	it('should log error if insertOne fails', async () => {
		const auditInput: AuditInput = {
			action: 'DELETE' as any,
			jobId: 'job456',
			timestamp: new Date(),
			user: {
				userId: 'u2',
				userEmail: 'admin@example.com',
				organizationId: 'org2',
				roleId: 'role2'
			},
			resource: {
				resourceType: 'User',
				resourceId: '456'
			}
		}

		const error = new Error('insert failed')
		collectionMock.insertOne.mockRejectedValueOnce(error)

		await repository.insert(auditInput)

		expect(loggerMock.error).toHaveBeenCalledWith(
			{ error },
			'Failed to insert audit record.'
		)
	})
})
