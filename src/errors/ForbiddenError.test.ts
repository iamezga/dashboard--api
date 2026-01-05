import { ForbiddenError } from './ForbiddenError'
import { HttpStatusCode } from './httpStatusCode'

describe('ForbiddenError', () => {
	it('should create an error with correct properties', () => {
		const message = 'Access denied to this resource'
		const error = new ForbiddenError(message)

		expect(error).toBeInstanceOf(Error)
		expect(error).toBeInstanceOf(ForbiddenError)
		expect(error.message).toBe(message)
		expect(error.name).toBe('ForbiddenError')
		expect(error.statusCode).toBe(HttpStatusCode.FORBIDDEN)
		expect(error.isOperational).toBe(true)
	})

	it('should have correct status code', () => {
		const error = new ForbiddenError('Test')
		expect(error.statusCode).toBe(403)
	})

	it('should have proper stack trace', () => {
		const error = new ForbiddenError('Test error')
		expect(error.stack).toBeDefined()
		expect(error.stack).toContain('ForbiddenError')
	})

	it('should be operational by default', () => {
		const error = new ForbiddenError('Test')
		expect(error.isOperational).toBe(true)
	})

	it('should work with different error messages', () => {
		const messages = [
			'You do not have permission',
			'Forbidden action',
			'Access denied'
		]

		messages.forEach(msg => {
			const error = new ForbiddenError(msg)
			expect(error.message).toBe(msg)
			expect(error.statusCode).toBe(HttpStatusCode.FORBIDDEN)
		})
	})

	it('should be catchable as Error', () => {
		try {
			throw new ForbiddenError('Test error')
		} catch (error) {
			expect(error).toBeInstanceOf(Error)
			expect(error).toBeInstanceOf(ForbiddenError)
			if (error instanceof ForbiddenError) {
				expect(error.statusCode).toBe(403)
			}
		}
	})

	it('should maintain prototype chain', () => {
		const error = new ForbiddenError('Test')
		expect(Object.getPrototypeOf(error)).toBe(ForbiddenError.prototype)
	})
})
