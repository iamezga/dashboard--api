import { useCases } from '../modules'
import { validateUseCases } from './useCaseValidator'

jest.mock('@/modules', () => ({
	useCases: {}
}))

describe('useCaseValidator', () => {
	const mockUseCases = useCases as Record<string, any>

	beforeEach(() => {
		// Clear all use cases before each test
		Object.keys(mockUseCases).forEach(key => {
			delete mockUseCases[key]
		})
	})

	describe('validateUseCases', () => {
		it('should not throw when all use cases with permissions have getPermissionValidationData', () => {
			mockUseCases['UserCreateUseCase'] = class {
				static permission = 'user.create'
				static getPermissionValidationData = jest.fn()
			}
			mockUseCases['UserGetUseCase'] = class {
				static permission = 'user.get'
				static getPermissionValidationData = jest.fn()
			}

			expect(() => validateUseCases()).not.toThrow()
		})

		it('should not throw when use case has no permission (public use case)', () => {
			mockUseCases['AuthLoginUseCase'] = class {
				// No permission property - public use case
			}
			mockUseCases['AuthPasswordRecoveryRequestUseCase'] = class {
				// No permission property - public use case
			}

			expect(() => validateUseCases()).not.toThrow()
		})

		it('should throw when use case has permission but missing getPermissionValidationData', () => {
			mockUseCases['UserCreateUseCase'] = class {
				static permission = 'user.create'
				// Missing getPermissionValidationData method
			}

			expect(() => validateUseCases()).toThrow(
				/UseCase "UserCreateUseCase" declares permission="user.create" but is missing the static method "getPermissionValidationData\(\)"/
			)
		})

		it('should throw when multiple use cases have permission but missing getPermissionValidationData', () => {
			mockUseCases['UserCreateUseCase'] = class {
				static permission = 'user.create'
			}
			mockUseCases['UserGetUseCase'] = class {
				static permission = 'user.get'
			}

			expect(() => validateUseCases()).toThrow(/Use case validation failed/)
			expect(() => validateUseCases()).toThrow(/UserCreateUseCase/)
			expect(() => validateUseCases()).toThrow(/UserGetUseCase/)
		})

		it('should handle mixed scenarios correctly', () => {
			mockUseCases['UserCreateUseCase'] = class {
				static permission = 'user.create'
				static getPermissionValidationData = jest.fn()
			}
			mockUseCases['AuthLoginUseCase'] = class {
				// Public - no permission
			}
			mockUseCases['UserDeleteUseCase'] = class {
				static permission = 'user.delete'
				// Missing getPermissionValidationData - should fail
			}

			expect(() => validateUseCases()).toThrow(
				/UseCase "UserDeleteUseCase" declares permission="user.delete" but is missing the static method "getPermissionValidationData\(\)"/
			)
		})

		it('should not throw when use case has getPermissionValidationData as function', () => {
			mockUseCases['UserCreateUseCase'] = class {
				static permission = 'user.create'
				static getPermissionValidationData() {
					return Promise.resolve({})
				}
			}

			expect(() => validateUseCases()).not.toThrow()
		})

		it('should throw when getPermissionValidationData is not a function', () => {
			mockUseCases['UserCreateUseCase'] = class {
				static permission = 'user.create'
				static getPermissionValidationData = 'not-a-function'
			}

			expect(() => validateUseCases()).toThrow(
				/UseCase "UserCreateUseCase" declares permission="user.create" but is missing the static method "getPermissionValidationData\(\)"/
			)
		})
	})
})
