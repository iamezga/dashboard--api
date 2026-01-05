import { DependencyContainer } from '../types/core/dependencyContainer'
import {
	JobScriptContext,
	JobScriptPayload
} from '../types/jobScript/JobScriptInterface'
import { CleanUpOldSessionsJob } from './CleanUpOldSessionsJob'

describe('CleanUpOldSessionsJob', () => {
	let jobScript: CleanUpOldSessionsJob
	let mockLogger: any
	let mockContainer: DependencyContainer
	let context: JobScriptContext

	beforeEach(() => {
		jest.clearAllMocks()
		jest.useFakeTimers()

		mockLogger = {
			info: jest.fn(),
			error: jest.fn(),
			warn: jest.fn(),
			debug: jest.fn()
		}

		mockContainer = {
			repositoryManager: {
				get: jest.fn()
			},
			libs: {
				dayjs: jest.fn().mockReturnValue('2026-01-04T12:00:00Z'),
				argon2: {} as any,
				jwt: {} as any,
				ms: {} as any
			},
			config: {} as any,
			services: {} as any
		} as any

		context = {
			logger: mockLogger,
			container: mockContainer
		}

		jobScript = new CleanUpOldSessionsJob()
	})

	afterEach(() => {
		jest.useRealTimers()
	})

	describe('run', () => {
		it('should execute successfully with default olderThanDays', async () => {
			const payload: JobScriptPayload = {}

			const promise = jobScript.run(payload, context)
			jest.advanceTimersByTime(2000)
			const result = await promise

			expect(mockLogger.info).toHaveBeenCalledWith(
				'Starting cleanup of sessions older than 30 days.'
			)
			expect(mockLogger.info).toHaveBeenCalledWith(
				'Session cleanup finished successfully.'
			)
			expect(result).toEqual({
				success: true,
				cleaned: 123,
				date: '2026-01-04T12:00:00Z'
			})
		})

		it('should execute with custom olderThanDays', async () => {
			const payload: JobScriptPayload = { olderThanDays: 60 }

			const promise = jobScript.run(payload, context)
			jest.advanceTimersByTime(2000)
			await promise

			expect(mockLogger.info).toHaveBeenCalledWith(
				'Starting cleanup of sessions older than 60 days.'
			)
		})

		it('should use olderThanDays from payload', async () => {
			const payload: JobScriptPayload = { olderThanDays: 90 }

			const promise = jobScript.run(payload, context)
			jest.advanceTimersByTime(2000)
			await promise

			expect(mockLogger.info).toHaveBeenCalledWith(
				'Starting cleanup of sessions older than 90 days.'
			)
		})

		it('should return success with cleaned count', async () => {
			const payload: JobScriptPayload = {}

			const promise = jobScript.run(payload, context)
			jest.advanceTimersByTime(2000)
			const result = await promise

			expect(result.success).toBe(true)
			expect(result.cleaned).toBe(123)
			expect(result.date).toBeDefined()
		})

		it('should simulate DB work with 2 second delay', async () => {
			const payload: JobScriptPayload = {}
			const startTime = Date.now()

			const promise = jobScript.run(payload, context)
			jest.advanceTimersByTime(2000)
			await promise

			const endTime = Date.now()
			expect(endTime - startTime).toBeGreaterThanOrEqual(2000)
		})

		it('should log start and finish messages', async () => {
			const payload: JobScriptPayload = { olderThanDays: 15 }

			const promise = jobScript.run(payload, context)
			jest.advanceTimersByTime(2000)
			await promise

			expect(mockLogger.info).toHaveBeenCalledTimes(2)
			expect(mockLogger.info).toHaveBeenNthCalledWith(
				1,
				'Starting cleanup of sessions older than 15 days.'
			)
			expect(mockLogger.info).toHaveBeenNthCalledWith(
				2,
				'Session cleanup finished successfully.'
			)
		})

		it('should use container libs dayjs', async () => {
			const payload: JobScriptPayload = {}

			const promise = jobScript.run(payload, context)
			jest.advanceTimersByTime(2000)
			const result = await promise

			expect(mockContainer.libs.dayjs).toHaveBeenCalled()
			expect(result.date).toBe('2026-01-04T12:00:00Z')
		})

		it('should handle olderThanDays = 0', async () => {
			const payload: JobScriptPayload = { olderThanDays: 0 }

			const promise = jobScript.run(payload, context)
			jest.advanceTimersByTime(2000)
			await promise

			expect(mockLogger.info).toHaveBeenCalledWith(
				'Starting cleanup of sessions older than 0 days.'
			)
		})
	})
})
