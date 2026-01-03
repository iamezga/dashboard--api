import { Logger } from 'pino'
import { RedisClientType } from 'redis'
import { RepositoryManager } from '../../../core/repositoryManager'
import { DependencyContainer } from '../../../types/core/dependencyContainer'
import { SessionUser } from '../entities/Session'
import { SessionRepository } from '../repository/SessionRepository'

describe('SessionRepository', () => {
	let repository: SessionRepository
	let dbMock: jest.Mocked<RedisClientType>
	let repositoryManagerMock: jest.Mocked<RepositoryManager>
	let multiMock: any
	let loggerMock: jest.Mocked<Logger>

	beforeEach(() => {
		multiMock = {
			sAdd: jest.fn().mockReturnThis(),
			set: jest.fn().mockReturnThis(),
			del: jest.fn().mockReturnThis(),
			sRem: jest.fn().mockReturnThis(),
			exec: jest.fn()
		}

		dbMock = {
			set: jest.fn(),
			get: jest.fn(),
			sAdd: jest.fn(),
			sRem: jest.fn(),
			del: jest.fn(),
			sMembers: jest.fn(),
			sCard: jest.fn(),
			multi: jest.fn().mockReturnValue(multiMock)
		} as unknown as jest.Mocked<RedisClientType>

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
		repository = new SessionRepository(dbMock as any, containerMock)
	})

	it('should save user data successfully', async () => {
		const userData: SessionUser = {
			id: 'u1',
			name: 'name',
			surname: 'surname',
			email: 'test@test.com',
			permissions: {},
			organizationId: 'org1',
			roleId: 'r1'
		}
		;(dbMock.set as jest.Mock).mockResolvedValue('OK')

		const result = await repository.saveUserData('u1', userData, 3600)
		expect(dbMock.set).toHaveBeenCalledWith(
			'user:data:u1',
			JSON.stringify(userData),
			{ EX: 3600 }
		)
		expect(result).toBe(true)
	})

	it('should return false if saveUserData fails', async () => {
		const userData: SessionUser = {
			id: 'u1',
			name: 'name',
			surname: 'surname',
			email: 'test@test.com',
			permissions: {},
			organizationId: 'org1',
			roleId: 'r1'
		}
		;(dbMock.set as jest.Mock).mockResolvedValue('FAIL')

		const result = await repository.saveUserData('u1', userData, 3600)
		expect(result).toBe(false)
	})

	it('should return user data from getUserData', async () => {
		const serialized = JSON.stringify({ userId: 'u1', email: 'test@test.com' })
		;(dbMock.get as jest.Mock).mockResolvedValue(serialized)

		const result = await repository.getUserData('u1')
		expect(result).toEqual({ userId: 'u1', email: 'test@test.com' })
	})

	it('should return null from getUserData if not found', async () => {
		;(dbMock.get as jest.Mock).mockResolvedValue(null)

		const result = await repository.getUserData('u1')
		expect(result).toBeNull()
	})

	it('should create a session and return sessionId', async () => {
		const sessionData = {
			userId: 'u1',
			lastActivity: Date.now(),
			maxInactiveTime: Date.now(),
			maxSessionTime: Date.now(),
			sessionStartTime: Date.now()
		}

		multiMock.exec.mockResolvedValue([1, 'OK'])
		const result = await repository.createSession('u1', sessionData, 3600)

		expect(dbMock.multi).toHaveBeenCalled()
		expect(multiMock.sAdd).toHaveBeenCalledWith(
			'user:sessions:u1',
			expect.any(String)
		)
		expect(multiMock.set).toHaveBeenCalledWith(
			expect.stringContaining('session:metadata:'),
			expect.any(String),
			{ EX: 3600 }
		)
		expect(result).toHaveLength(36)
	})

	it('should return null from createSession if transaction fails', async () => {
		const sessionData = {
			userId: 'u1',
			lastActivity: Date.now(),
			token: 'abc123'
		}
		multiMock.exec.mockResolvedValue([0, 'ERR'])

		const result = await repository.createSession(
			'u1',
			sessionData as any,
			3600
		)
		expect(result).toBeNull()
	})

	it('should return null when deserialize fails (catch branch)', async () => {
		const invalidJson = '{ this is not valid json }'
		const result = (repository as any).deserialize(invalidJson)
		expect(result).toBeNull()
	})

	it('should deserialize valid JSON', () => {
		const obj = { sessionId: 's1', userId: 'u1' }
		const serialized = JSON.stringify(obj)
		const result = (repository as any).deserialize(serialized)
		expect(result).toEqual(obj)
	})

	it('should get user session ids', async () => {
		dbMock.sMembers.mockResolvedValue(['sess1', 'sess2'])
		const result = await repository.getUserSessionIds('u1')
		expect(result).toEqual(['sess1', 'sess2'])
		expect(dbMock.sMembers).toHaveBeenCalledWith('user:sessions:u1')
	})

	it('should return session metadata or null', async () => {
		const metadata = { sessionId: 's1', userId: 'u1' }
		dbMock.get.mockResolvedValue(JSON.stringify(metadata))
		const result = await repository.getSessionMetadata('s1')
		expect(result).toEqual(metadata)

		dbMock.get.mockResolvedValue(null)
		const nullResult = await repository.getSessionMetadata('s2')
		expect(nullResult).toBeNull()
	})

	it('should return boolean for active sessions', async () => {
		dbMock.sCard.mockResolvedValue(3)
		const active = await repository.hasActiveSessions('u1')
		expect(active).toBe(true)

		dbMock.sCard.mockResolvedValue(0)
		const inactive = await repository.hasActiveSessions('u2')
		expect(inactive).toBe(false)
	})

	it('should delete a session and return boolean', async () => {
		const sessionMetadata = { sessionId: 's1', userId: 'u1' }
		jest
			.spyOn(repository, 'getSessionMetadata')
			.mockResolvedValue(sessionMetadata as any)

		multiMock.exec.mockResolvedValue([1, 1])
		const result = await repository.deleteSession('s1')
		expect(result).toBe(true)

		jest.spyOn(repository, 'getSessionMetadata').mockResolvedValue(null)
		const failResult = await repository.deleteSession('s2')
		expect(failResult).toBe(false)
	})

	it('should delete all user sessions', async () => {
		dbMock.sMembers.mockResolvedValue(['s1', 's2'])
		multiMock.exec.mockResolvedValue([])
		await repository.deleteAllUserSessions('u1')
		expect(dbMock.multi).toHaveBeenCalled()
		expect(multiMock.del).toHaveBeenCalledWith('user:data:u1')
		expect(multiMock.del).toHaveBeenCalledWith('user:sessions:u1')
		expect(multiMock.del).toHaveBeenCalledWith('session:metadata:s1')
		expect(multiMock.del).toHaveBeenCalledWith('session:metadata:s2')

		dbMock.sMembers.mockResolvedValue([])
		await repository.deleteAllUserSessions('u2')
	})

	it('should update last activity successfully and return false if session not found', async () => {
		const sessionMetadata = { sessionId: 's1', userId: 'u1', lastActivity: 0 }
		const spyDeserialize = jest.spyOn(repository as any, 'deserialize')
		spyDeserialize.mockReturnValue(sessionMetadata)

		dbMock.get.mockResolvedValue(JSON.stringify(sessionMetadata))
		dbMock.set.mockResolvedValue('OK')

		const result = await repository.updateLastActivity('s1', 3600)
		expect(result).toBe(true)
		expect(dbMock.set).toHaveBeenCalled()

		dbMock.get.mockResolvedValue(null)
		const notFound = await repository.updateLastActivity('s2', 3600)
		expect(notFound).toBe(false)

		spyDeserialize.mockReturnValue(null)
		dbMock.get.mockResolvedValue(JSON.stringify(sessionMetadata))
		const invalidData = await repository.updateLastActivity('s3', 3600)
		expect(invalidData).toBe(false)
	})
})
