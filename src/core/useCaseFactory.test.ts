import { getContainer } from '../core/dependencyContainer'
import { useCaseFactory } from '../core/useCaseFactory'
import { DependencyContainer } from '../types/core/dependencyContainer'
import { JobInterface } from '../types/job/JobInterface'
import { UseCaseInterface } from '../types/useCase/UseCaseInterface'

// --- MOCK useCases ---
jest.mock('@/modules', () => {
	class FakeUseCase implements UseCaseInterface {
		permission?: string | undefined
		container: any
		options: any
		constructor(container: any, options?: any) {
			this.container = container
			this.options = options
		}

		run(_job: JobInterface) {
			return {} as any
		}
	}
	return {
		useCases: {
			FAKE_USECASE: FakeUseCase
		},
		UseCaseKeys: {
			FAKE_USECASE: 'FAKE_USECASE'
		}
	}
})

jest.mock('../core/dependencyContainer', () => {
	const originalModule = jest.requireActual('../core/dependencyContainer')
	return {
		...originalModule,
		getContainer: jest.fn(() => ({ mocked: true } as any))
	}
})

describe('useCaseFactory', () => {
	let containerMock: DependencyContainer

	beforeEach(() => {
		containerMock = { someValue: true } as any
	})

	it('should return a use case instance for a valid use case name', () => {
		const useCase = useCaseFactory('FAKE_USECASE' as any, {
			container: containerMock
		})

		expect(useCase).toBeDefined()
		expect(typeof useCase.run).toBe('function')
		expect((useCase as any).container).toBe(containerMock)
		expect((useCase as any).options).toBeUndefined()
	})
	it('should return a use case instance without use case options', () => {
		const useCase = useCaseFactory('FAKE_USECASE' as any)

		expect(useCase).toBeDefined()
		expect(typeof useCase.run).toBe('function')
		expect((useCase as any).container).toBeDefined()
		expect((useCase as any).options).toBeUndefined()
	})

	it('should pass options to the use case instance', () => {
		const options = { key: 'value' }
		const useCase = useCaseFactory('FAKE_USECASE' as any, {
			container: containerMock,
			options
		})

		expect((useCase as any).options).toBe(options)
	})

	it('should use default container if not provided', () => {
		const defaultContainer = getContainer()
		const useCase = useCaseFactory('FAKE_USECASE' as any)

		expect((useCase as any).container).toStrictEqual(defaultContainer)
	})

	it('should throw an error if use case name does not exist', () => {
		expect(() =>
			useCaseFactory('NON_EXISTENT_USECASE' as any, {
				container: containerMock
			})
		).toThrow('Use case "NON_EXISTENT_USECASE" not found.')
	})
})
