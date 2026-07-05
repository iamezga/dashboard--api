import { vi } from 'vitest'
import { UnauthorizedError } from '../../errors'
import { useCases } from '../../modules'
import { validator } from '../../services/validationService'
import { permissionMiddleware } from './permissionMiddleware'

vi.mock('@/services/validationService', () => ({
	validator: { validate: vi.fn() }
}))

vi.mock('@/services/logger', () => ({
	__esModule: true,
	default: {
		error: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn()
	}
}))

vi.mock('@/core/dependencyContainer', () => ({
	getContainer: vi.fn(() => ({ fake: 'container' }))
}))

describe('permissionMiddleware', () => {
	const next = vi.fn()
	const res: any = { locals: {} }
	const req: any = {}

	beforeEach(() => {
		vi.clearAllMocks()
		res.locals = {}
	})

	it('should throw Error if job is missing', async () => {
		const middleware = permissionMiddleware('UserCreateUseCase')
		await middleware(req, res, next)

		expect(next).toHaveBeenCalledWith(expect.any(Error))
	})

	it('should throw Error if useCase is missing', async () => {
		const middleware = permissionMiddleware('NonExistentUseCase' as any)
		res.locals.job = { id: 1 }

		await middleware(req, res, next)

		expect(next).toHaveBeenCalledWith(expect.any(Error))
	})

	it('should throw Error if useCase is missing permission configuration', async () => {
		;(useCases as any).InvalidCase = class {}

		const middleware = permissionMiddleware('InvalidCase' as any)
		res.locals.job = { id: 1 }

		await middleware(req, res, next)

		expect(next).toHaveBeenCalledWith(expect.any(Error))
	})

	it('should throw Error if useCase has permission but missing getPermissionValidationData method', async () => {
		;(useCases as any).MissingMethodCase = class {
			static readonly permission = 'user.test'
			// Missing getPermissionValidationData method
		}

		const middleware = permissionMiddleware('MissingMethodCase' as any)
		res.locals.job = { id: 1 }

		await middleware(req, res, next)

		expect(next).toHaveBeenCalledWith(expect.any(Error))
		const errorArg = (next as ReturnType<typeof vi.fn>).mock.calls[0][0]
		expect(errorArg.message).toContain('missing getPermissionValidationData()')
	})

	it('should throw UnauthorizedError if validator returns errors', async () => {
		;(useCases as any).SecureCase = class {
			static readonly permission = 'user.create'
			static async getPermissionValidationData(_job: any, _container: any) {
				return {
					schema: { permission: { type: 'enum', values: ['user.create'] } },
					data: { permission: 'invalid.permission' }
				}
			}
		}
		res.locals.job = { id: 1 }
		;(validator.validate as ReturnType<typeof vi.fn>).mockResolvedValue([{ message: 'error' }])

		const middleware = permissionMiddleware('SecureCase' as any)
		await middleware(req, res, next)
		const errorArg = (next as ReturnType<typeof vi.fn>).mock.calls[0][0]

		expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError))
		expect(errorArg.message).toBe(
			`Authorization failed: you don't have permissions for this action.`
		)
	})

	it('should call next() if validator returns no errors', async () => {
		;(useCases as any).SecureCase = class {
			static readonly permission = 'user.create'
			static async getPermissionValidationData(_job: any, _container: any) {
				return {
					schema: { permission: { type: 'enum', values: ['user.create'] } },
					data: { permission: 'user.create' }
				}
			}
		}
		res.locals.job = { id: 1 }
		;(validator.validate as ReturnType<typeof vi.fn>).mockResolvedValue([])

		const middleware = permissionMiddleware('SecureCase' as any)
		await middleware(req, res, next)

		expect(next).toHaveBeenCalledWith()
	})
})
