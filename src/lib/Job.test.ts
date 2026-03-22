import { Logger } from 'pino'
import { Job } from './Job'

describe('Job', () => {
	let logger: jest.Mocked<Logger>

	beforeEach(() => {
		logger = {
			info: jest.fn(),
			error: jest.fn(),
			warn: jest.fn(),
			debug: jest.fn(),
			trace: jest.fn(),
			fatal: jest.fn(),
			child: jest.fn() as any
		} as unknown as jest.Mocked<Logger>
	})

	beforeAll(() => {
		jest.spyOn(console, 'info').mockImplementation(() => {})
	})

	afterAll(() => {
		;(console.info as jest.Mock).mockRestore()
	})

	const baseOptions = (logger: Logger) =>
		({
			id: 'job-1',
			attempts: 1,
			meta: { status: 'pending' } as any,
			user: {
				id: 'user-1',
				organizationId: 'org-1',
				email: 'test@example.com',
				name: 'Test',
				surname: 'User',
				roleId: 'role-1',
				active: true,
				config: { theme: 'dark' }
			},
			logger
		}) as any

	it('should initialize defaults when data, meta and recaptchaResponse are missing', () => {
		const job = new Job({
			id: 'job-2',
			attempts: 0,
			logger
			// no data
			// no meta
			// no recaptchaResponse
		} as any)

		expect(job.getData()).toEqual({}) // default from ?? {}
		expect(job.getRecaptchaResponse()).toBeUndefined() // no value assigned
		expect(job.getMeta()).toEqual({}) // default from ?? {}
	})

	it('should initialize and clone data in constructor', () => {
		const job = new Job(baseOptions(logger))
		expect(job.getId()).toBe('job-1')
		expect(job.getAttempts()).toBe(1)
		expect(job.getData()).toEqual({})
		expect(job.getMeta()).toEqual({ status: 'pending' })
		expect(job.getUser()).toEqual(baseOptions(logger).user)
		expect(job.getRecaptchaResponse()).toBe(undefined)
	})

	it('should set and get meta correctly', () => {
		const job = new Job(baseOptions(logger))
		job.setMeta({ status: 'updated' } as any)
		expect(job.getMeta()).toEqual({ status: 'updated' })
	})

	it('should update meta partially', () => {
		const job = new Job(baseOptions(logger))
		job.updateMeta({ foo: 'bar' } as any)
		expect(job.getMeta()).toEqual({ status: 'pending', foo: 'bar' })
	})

	it('should set and get data correctly', () => {
		const job = new Job(baseOptions(logger))
		job.setData({ foo: 'bar' })
		job.setData({ baz: 'qux' })
		expect(job.getData()).toEqual({ foo: 'bar', baz: 'qux' })
	})

	it('should set and get user correctly', () => {
		const job = new Job(baseOptions(logger))
		const newUser = { ...baseOptions(logger).user, id: 'user-2' }
		job.setUser(newUser as any)
		expect(job.getUser()).toEqual(newUser)
	})

	it('should throw if user is missing in context', () => {
		const job = new Job({ ...baseOptions(logger), user: undefined })
		expect(() => job.getUser()).toThrow('User data is missing in Job context')
	})

	it('should return public user DTO without sensitive data', () => {
		const job = new Job(baseOptions(logger))
		expect(job.getPublicUser()).toEqual({
			id: 'user-1',
			organizationId: 'org-1',
			email: 'test@example.com',
			name: 'Test',
			surname: 'User',
			roleId: 'role-1',
			active: true,
			config: { theme: 'dark' }
		})
	})

	it('should return undefined from getPublicUser if no user', () => {
		const job = new Job({ ...baseOptions(logger), user: undefined })
		expect(job.getPublicUser()).toBeUndefined()
	})

	it('should get and set attempts', () => {
		const job = new Job(baseOptions(logger))
		job.setAttempts(5)
		expect(job.getAttempts()).toBe(5)
	})

	it('should return initial progress as 0', () => {
		const job = new Job(baseOptions(logger))
		expect(job.getProgress()).toBe(0)
	})

	it('should trigger onFail callback and update meta on markFailed', () => {
		const job = new Job(baseOptions(logger))
		const cb = jest.fn()
		job.onFail(cb)
		const err = new Error('boom')
		job.markFailed('E123', err)
		const meta = job.getMeta()
		expect(meta.status).toBe('failed')
		expect(meta.errorId).toBe('E123')
		expect(logger.error).toHaveBeenCalledTimes(1)
		expect(logger.error).toHaveBeenCalledWith(
			expect.stringContaining('[Job job-1] Failed (E123): Error - boom')
		)
		expect(cb).toHaveBeenCalledWith('E123', err, job)
	})

	it('should trigger onComplete callback and update meta on markCompleted', () => {
		const job = new Job(baseOptions(logger))
		const cb = jest.fn()
		job.onComplete(cb)
		job.markCompleted()
		expect(job.getMeta().status).toBe('completed')
		expect(logger.info).toHaveBeenCalledTimes(1)
		expect(logger.info).toHaveBeenCalledWith(
			expect.stringContaining('[Job job-1] Completed')
		)
		expect(cb).toHaveBeenCalledWith(job)
	})

	it('should trigger onProgress callback on markInProgress', () => {
		const job = new Job(baseOptions(logger))
		const cb = jest.fn()
		job.onProgress(cb)
		job.markInProgress()
		expect(job.getMeta().status).toBe('in_progress')
		expect(cb).toHaveBeenCalledWith(0, job)
	})

	it('should update progress and meta when markInProgress is called with value', () => {
		const job = new Job(baseOptions(logger))
		job.markInProgress(42)
		expect(job.getProgress()).toBe(42)
		expect(job.getMeta().status).toBe('in_progress')
	})

	it('should trigger onUpdateProgress callback on updateProgress', () => {
		const job = new Job(baseOptions(logger))
		const cb = jest.fn()
		job.onUpdateProgress(cb)
		job.updateProgress(77)
		expect(job.getProgress()).toBe(77)
		expect(cb).toHaveBeenCalledWith(77, job)
	})

	it('should get and set recaptcha response', () => {
		const job = new Job(baseOptions(logger))
		job.setRecaptchaResponse('new-token')
		expect(job.getRecaptchaResponse()).toBe('new-token')
	})
})
