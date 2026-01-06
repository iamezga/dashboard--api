import {
	ensureUniqueSlug,
	generateSlug,
	isReservedSlug,
	isValidSlug,
	RESERVED_SLUGS
} from './slugHelper'

describe('slugHelper', () => {
	describe('generateSlug', () => {
		it('should convert text to lowercase', () => {
			expect(generateSlug('Acme Corporation')).toBe('acme-corporation')
		})

		it('should replace spaces with hyphens', () => {
			expect(generateSlug('hello world')).toBe('hello-world')
		})

		it('should replace underscores with hyphens', () => {
			expect(generateSlug('hello_world_test')).toBe('hello-world-test')
		})

		it('should remove special characters', () => {
			expect(generateSlug('Acme Corp. Inc!')).toBe('acme-corp-inc')
			expect(generateSlug("José's Café & Bakery")).toBe('joses-cafe-bakery')
		})

		it('should remove accents', () => {
			expect(generateSlug('Café Français')).toBe('cafe-francais')
			expect(generateSlug('Niño Español')).toBe('nino-espanol')
		})

		it('should remove consecutive hyphens', () => {
			expect(generateSlug('hello---world')).toBe('hello-world')
		})

		it('should remove leading and trailing hyphens', () => {
			expect(generateSlug('  hello world  ')).toBe('hello-world')
			expect(generateSlug('-hello-world-')).toBe('hello-world')
		})

		it('should handle empty string', () => {
			expect(generateSlug('')).toBe('')
		})

		it('should handle only special characters', () => {
			expect(generateSlug('!@#$%^&*()')).toBe('')
		})

		it('should handle mixed cases', () => {
			expect(generateSlug('InnovaTech Solutions 2024')).toBe(
				'innovatech-solutions-2024'
			)
		})
	})

	describe('isValidSlug', () => {
		it('should accept valid slugs', () => {
			expect(isValidSlug('acme')).toBe(true)
			expect(isValidSlug('acme-corp')).toBe(true)
			expect(isValidSlug('acme-corp-inc')).toBe(true)
			expect(isValidSlug('company123')).toBe(true)
			expect(isValidSlug('123company')).toBe(true)
			expect(isValidSlug('a1-b2-c3')).toBe(true)
		})

		it('should reject slugs with uppercase letters', () => {
			expect(isValidSlug('Acme')).toBe(false)
			expect(isValidSlug('Acme-Corp')).toBe(false)
		})

		it('should reject slugs with underscores', () => {
			expect(isValidSlug('acme_corp')).toBe(false)
		})

		it('should reject slugs starting or ending with hyphen', () => {
			expect(isValidSlug('-acme')).toBe(false)
			expect(isValidSlug('acme-')).toBe(false)
		})

		it('should reject slugs with consecutive hyphens', () => {
			expect(isValidSlug('acme--corp')).toBe(false)
		})

		it('should reject slugs that are too short', () => {
			expect(isValidSlug('ab')).toBe(false)
			expect(isValidSlug('a')).toBe(false)
		})

		it('should reject slugs that are too long', () => {
			const longSlug = 'a'.repeat(64)
			expect(isValidSlug(longSlug)).toBe(false)
		})

		it('should accept slugs at boundary lengths', () => {
			expect(isValidSlug('abc')).toBe(true) // 3 chars (min)
			expect(isValidSlug('a'.repeat(63))).toBe(true) // 63 chars (max)
		})

		it('should reject slugs with special characters', () => {
			expect(isValidSlug('acme@corp')).toBe(false)
			expect(isValidSlug('acme.corp')).toBe(false)
			expect(isValidSlug('acme corp')).toBe(false)
		})
	})

	describe('isReservedSlug', () => {
		it('should return true for reserved slugs', () => {
			expect(isReservedSlug('www')).toBe(true)
			expect(isReservedSlug('api')).toBe(true)
			expect(isReservedSlug('admin')).toBe(true)
			expect(isReservedSlug('system')).toBe(true)
		})

		it('should be case insensitive', () => {
			expect(isReservedSlug('WWW')).toBe(true)
			expect(isReservedSlug('Api')).toBe(true)
			expect(isReservedSlug('ADMIN')).toBe(true)
		})

		it('should return false for non-reserved slugs', () => {
			expect(isReservedSlug('acme')).toBe(false)
			expect(isReservedSlug('innovatech')).toBe(false)
			expect(isReservedSlug('quantum')).toBe(false)
		})

		it('should have all expected reserved slugs', () => {
			const expectedReserved = [
				'www',
				'api',
				'app',
				'admin',
				'dashboard',
				'system',
				'auth',
				'login',
				'signup',
				'register',
				'logout',
				'account',
				'settings',
				'profile',
				'help',
				'support',
				'docs',
				'mail',
				'email',
				'cdn',
				'static'
			]

			expectedReserved.forEach(slug => {
				expect(RESERVED_SLUGS).toContain(slug)
			})
		})
	})

	describe('ensureUniqueSlug', () => {
		it('should return the base slug if it does not exist', async () => {
			const checkExists = jest.fn().mockResolvedValue(false)
			const result = await ensureUniqueSlug('acme-corp', checkExists)

			expect(result).toBe('acme-corp')
			expect(checkExists).toHaveBeenCalledTimes(1)
			expect(checkExists).toHaveBeenCalledWith('acme-corp')
		})

		it('should append -2 if base slug exists', async () => {
			const checkExists = jest
				.fn()
				.mockResolvedValueOnce(true) // acme-corp exists
				.mockResolvedValueOnce(false) // acme-corp-2 does not exist

			const result = await ensureUniqueSlug('acme-corp', checkExists)

			expect(result).toBe('acme-corp-2')
			expect(checkExists).toHaveBeenCalledTimes(2)
			expect(checkExists).toHaveBeenNthCalledWith(1, 'acme-corp')
			expect(checkExists).toHaveBeenNthCalledWith(2, 'acme-corp-2')
		})

		it('should keep incrementing until a unique slug is found', async () => {
			const checkExists = jest
				.fn()
				.mockResolvedValueOnce(true) // acme-corp exists
				.mockResolvedValueOnce(true) // acme-corp-2 exists
				.mockResolvedValueOnce(true) // acme-corp-3 exists
				.mockResolvedValueOnce(false) // acme-corp-4 does not exist

			const result = await ensureUniqueSlug('acme-corp', checkExists)

			expect(result).toBe('acme-corp-4')
			expect(checkExists).toHaveBeenCalledTimes(4)
		})

		it('should throw error if max attempts reached', async () => {
			const checkExists = jest.fn().mockResolvedValue(true) // Always exists

			await expect(
				ensureUniqueSlug('acme-corp', checkExists, 5)
			).rejects.toThrow('Could not generate unique slug after 5 attempts')

			expect(checkExists).toHaveBeenCalledTimes(5)
		})

		it('should use default max attempts of 100', async () => {
			const checkExists = jest.fn().mockResolvedValue(true) // Always exists

			await expect(ensureUniqueSlug('acme-corp', checkExists)).rejects.toThrow(
				'Could not generate unique slug after 100 attempts'
			)

			expect(checkExists).toHaveBeenCalledTimes(100)
		})

		it('should work with async checkExists function', async () => {
			const existingSlugs = new Set(['acme-corp', 'acme-corp-2'])
			const checkExists = async (slug: string) => {
				// Simulate async database call
				await new Promise(resolve => setTimeout(resolve, 10))
				return existingSlugs.has(slug)
			}

			const result = await ensureUniqueSlug('acme-corp', checkExists)

			expect(result).toBe('acme-corp-3')
		})
	})
})
