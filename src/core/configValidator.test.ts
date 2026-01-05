import { config } from '../services/config'
import { validateConfig } from './configValidator'

jest.mock('../services/config')

describe('configValidator', () => {
	const mockConfig = config as jest.Mocked<typeof config>

	beforeEach(() => {
		jest.clearAllMocks()
	})

	describe('validateConfig', () => {
		it('should not throw when audit.provider is in database.providers', () => {
			;(mockConfig.get as any).mockImplementation((key: any) => {
				if (key === 'audit.provider') return 'postgres'
				if (key === 'database.providers') return ['postgres', 'mongo']
				if (key === 'jwt.secret') return 'secret'
				if (key === 'jwt.expiresIn') return '1h'
				return undefined
			})

			expect(() => validateConfig()).not.toThrow()
		})

		it('should throw when audit.provider is NOT in database.providers', () => {
			;(mockConfig.get as any).mockImplementation((key: any) => {
				if (key === 'audit.provider') return 'redis'
				if (key === 'database.providers') return ['postgres', 'mongo']
				if (key === 'jwt.secret') return 'secret'
				if (key === 'jwt.expiresIn') return '1h'
				return undefined
			})

			expect(() => validateConfig()).toThrow(
				'audit.provider="redis" not in database.providers'
			)
		})

		it('should throw when jwt.secret is missing', () => {
			;(mockConfig.get as any).mockImplementation((key: any) => {
				if (key === 'audit.provider') return 'postgres'
				if (key === 'database.providers') return ['postgres']
				if (key === 'jwt.secret') return ''
				if (key === 'jwt.expiresIn') return '1h'
				return undefined
			})

			expect(() => validateConfig()).toThrow(
				'jwt.secret and jwt.expiresIn must be configured'
			)
		})

		it('should throw when jwt.expiresIn is missing', () => {
			;(mockConfig.get as any).mockImplementation((key: any) => {
				if (key === 'audit.provider') return 'postgres'
				if (key === 'database.providers') return ['postgres']
				if (key === 'jwt.secret') return 'secret'
				if (key === 'jwt.expiresIn') return ''
				return undefined
			})

			expect(() => validateConfig()).toThrow(
				'jwt.secret and jwt.expiresIn must be configured'
			)
		})

		it('should throw when both jwt.secret and jwt.expiresIn are missing', () => {
			;(mockConfig.get as any).mockImplementation((key: any) => {
				if (key === 'audit.provider') return 'postgres'
				if (key === 'database.providers') return ['postgres']
				if (key === 'jwt.secret') return null
				if (key === 'jwt.expiresIn') return null
				return undefined
			})

			expect(() => validateConfig()).toThrow(
				'jwt.secret and jwt.expiresIn must be configured'
			)
		})

		it('should pass with valid configuration', () => {
			;(mockConfig.get as any).mockImplementation((key: any) => {
				if (key === 'audit.provider') return 'mongo'
				if (key === 'database.providers') return ['postgres', 'mongo']
				if (key === 'jwt.secret') return 'my-secret-key'
				if (key === 'jwt.expiresIn') return '2h'
				return undefined
			})

			expect(() => validateConfig()).not.toThrow()
		})
	})
})
