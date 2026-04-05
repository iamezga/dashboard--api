import { Logger } from 'pino'
import { RedisClientType } from 'redis'
import { DependencyContainer } from '../../../types/core/dependencyContainer'
import { SessionContext, SessionMetadataInput } from '../entities/Session'
import { SessionRepository } from '../repository/SessionRepository'

jest.mock('node:crypto', () => ({
	randomUUID: jest.fn(() => 'session-uuid-123')
}))

describe('SessionRepository', () => {
	let repository: SessionRepository
	let dbMock: jest.Mocked<RedisClientType>
	let multiMock: any
	let loggerMock: jest.Mocked<Logger>

	const baseSessionMetadata: SessionMetadataInput = {
		userId: 'u1',
		sessionStartTime: 1000,
		lastActivity: 1000,
		maxSessionTime: 3600,
		maxInactiveTime: 1800
	}

	const baseSessionContext: SessionContext = {
		user: {
			id: 'u1',
			email: 'test@test.com',
			name: 'Test',
			surname: 'User',
			status: 'active',
			config: {},
			lastLogin: null
		},
		memberships: [],
		activeMembership: null
	}

	beforeEach(() => {
		multiMock = {
			sAdd: jest.fn().mockReturnThis(),
			set: jest.fn().mockReturnThis(),
			del: jest.fn().mockReturnThis(),
			sRem: jest.fn().mockReturnThis(),
			expire: jest.fn().mockReturnThis(),
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

		loggerMock = {
			info: jest.fn(),
			error: jest.fn(),
			warn: jest.fn(),
			debug: jest.fn()
		} as any

		const containerMock = {
			logger: loggerMock
		} as unknown as DependencyContainer

		repository = new SessionRepository(dbMock as any, containerMock)
	})

	it('should create a session and return sessionId', async () => {
		multiMock.exec.mockResolvedValue([1, 'OK', 'OK'])
		const result = await repository.createSession(
			'u1',
			baseSessionMetadata,
			baseSessionContext,
			3600
		)

		expect(dbMock.multi).toHaveBeenCalled()
		expect(multiMock.sAdd).toHaveBeenCalledWith(
			'user:sessions:u1',
			'session-uuid-123'
		)
		expect(multiMock.set).toHaveBeenCalledWith(
			'session:metadata:session-uuid-123',
			expect.any(String),
			{ EX: 3600 }
		)
		expect(multiMock.set).toHaveBeenCalledWith(
			'session:context:session-uuid-123',
			expect.any(String),
			{ EX: 3600 }
		)
		expect(result).toBe('session-uuid-123')
	})

	it('should return null from createSession if transaction fails', async () => {
		multiMock.exec.mockResolvedValue([0, 'ERR', 'ERR'])

		const result = await repository.createSession(
			'u1',
			baseSessionMetadata,
			baseSessionContext,
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
		const metadata = { ...baseSessionMetadata, sessionId: 's1' }
		dbMock.get.mockResolvedValue(JSON.stringify(metadata))
		const result = await repository.getSessionMetadata('s1')
		expect(result).toEqual(metadata)

		dbMock.get.mockResolvedValue(null)
		const nullResult = await repository.getSessionMetadata('s2')
		expect(nullResult).toBeNull()
	})

	it('should return session context or null', async () => {
		dbMock.get.mockResolvedValue(JSON.stringify(baseSessionContext))
		const result = await repository.getSessionContext('s1')
		expect(result).toEqual(baseSessionContext)

		dbMock.get.mockResolvedValue(null)
		const nullResult = await repository.getSessionContext('s2')
		expect(nullResult).toBeNull()
	})

	it('should update session context', async () => {
		dbMock.set.mockResolvedValue('OK')
		const result = await repository.updateSessionContext(
			's1',
			baseSessionContext,
			1800
		)

		expect(dbMock.set).toHaveBeenCalledWith(
			'session:context:s1',
			expect.any(String),
			{ EX: 1800 }
		)
		expect(result).toBe(true)
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
		const sessionMetadata = { ...baseSessionMetadata, sessionId: 's1' }
		jest
			.spyOn(repository, 'getSessionMetadata')
			.mockResolvedValue(sessionMetadata as any)

		multiMock.exec.mockResolvedValue([1, 1, 1])
		const result = await repository.deleteSession('s1')
		expect(result).toBe(true)
		expect(multiMock.del).toHaveBeenCalledWith('session:metadata:s1')
		expect(multiMock.del).toHaveBeenCalledWith('session:context:s1')
		expect(multiMock.sRem).toHaveBeenCalledWith('user:sessions:u1', 's1')

		jest.spyOn(repository, 'getSessionMetadata').mockResolvedValue(null)
		const failResult = await repository.deleteSession('s2')
		expect(failResult).toBe(false)
	})

	it('should delete all user sessions', async () => {
		dbMock.sMembers.mockResolvedValue(['s1', 's2'])
		multiMock.exec.mockResolvedValue([])
		await repository.deleteAllUserSessions('u1')
		expect(dbMock.multi).toHaveBeenCalled()
		expect(multiMock.del).toHaveBeenCalledWith('user:sessions:u1')
		expect(multiMock.del).toHaveBeenCalledWith('session:metadata:s1')
		expect(multiMock.del).toHaveBeenCalledWith('session:context:s1')
		expect(multiMock.del).toHaveBeenCalledWith('session:metadata:s2')
		expect(multiMock.del).toHaveBeenCalledWith('session:context:s2')

		dbMock.sMembers.mockResolvedValue([])
		await repository.deleteAllUserSessions('u2')
	})

	it('should update last activity successfully and return false if session not found', async () => {
		const sessionMetadata = {
			...baseSessionMetadata,
			sessionId: 's1',
			lastActivity: 0
		}
		const spyDeserialize = jest.spyOn(repository as any, 'deserialize')
		spyDeserialize.mockReturnValue(sessionMetadata)

		dbMock.get.mockResolvedValue(JSON.stringify(sessionMetadata))
		multiMock.exec.mockResolvedValue(['OK', 1])

		const result = await repository.updateLastActivity('s1', 3600)
		expect(result).toBe(true)
		expect(multiMock.set).toHaveBeenCalledWith(
			'session:metadata:s1',
			expect.any(String),
			{ EX: 3600 }
		)
		expect(multiMock.expire).toHaveBeenCalledWith('session:context:s1', 3600)

		dbMock.get.mockResolvedValue(null)
		const notFound = await repository.updateLastActivity('s2', 3600)
		expect(notFound).toBe(false)

		spyDeserialize.mockReturnValue(null)
		dbMock.get.mockResolvedValue(JSON.stringify(sessionMetadata))
		const invalidData = await repository.updateLastActivity('s3', 3600)
		expect(invalidData).toBe(false)
	})
})
