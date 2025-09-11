import { UnauthorizedError } from '../../errors'
import { useCases } from '../../modules'
import { validator } from '../../services/validationService'
import { permissionMiddleware } from './permissionMiddleware'

jest.mock('@/services/validationService', () => ({
	validator: { validate: jest.fn() }
}))

jest.mock('@/services/logger', () => ({
	__esModule: true,
	default: {
		error: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		debug: jest.fn()
	}
}))

describe('permissionMiddleware', () => {
	const next = jest.fn()
	const res: any = { locals: {} }
	const req: any = {}

	beforeEach(() => {
		jest.clearAllMocks()
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

	it('should throw UnauthorizedError if validator returns errors', async () => {
		;(useCases as any).SecureCase = class {
			static readonly permission = 'user.create'
			static async getPermissionValidationData() {
				return {
					schema: { permission: { type: 'enum', values: ['user.create'] } },
					data: { permission: 'invalid.permission' }
				}
			}
		}
		res.locals.job = { id: 1 }
		;(validator.validate as jest.Mock).mockResolvedValue([{ message: 'error' }])

		const middleware = permissionMiddleware('SecureCase' as any)
		await middleware(req, res, next)
		const errorArg = (next as jest.Mock).mock.calls[0][0]

		expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError))
		expect(errorArg.message).toBe(
			`Authorization failed: you don't have permissions for this action.`
		)
	})

	it('should call next() if validator returns no errors', async () => {
		;(useCases as any).SecureCase = class {
			static readonly permission = 'user.create'
			static async getPermissionValidationData() {
				return {
					schema: { permission: { type: 'enum', values: ['user.create'] } },
					data: { permission: 'user.create' }
				}
			}
		}
		res.locals.job = { id: 1 }
		;(validator.validate as jest.Mock).mockResolvedValue([])

		const middleware = permissionMiddleware('SecureCase' as any)
		await middleware(req, res, next)

		expect(next).toHaveBeenCalledWith()
	})
})
