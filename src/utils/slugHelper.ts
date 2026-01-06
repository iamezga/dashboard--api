/**
 * Generates a URL-friendly slug from a given string.
 *
 * Rules:
 * - Converts to lowercase
 * - Removes accents and special characters
 * - Replaces spaces and underscores with hyphens
 * - Removes consecutive hyphens
 * - Removes leading/trailing hyphens
 * - Only allows a-z, 0-9, and hyphens
 *
 * @param text - The text to convert to a slug
 * @returns A URL-friendly slug
 *
 * @example
 * generateSlug("Acme Corporation Inc.") // "acme-corporation-inc"
 * generateSlug("José's Café & Bakery") // "joses-cafe-bakery"
 * generateSlug("  Hello___World  ") // "hello-world"
 */
export function generateSlug(text: string): string {
	return text
		.toLowerCase()
		.normalize('NFD') // Decompose accented characters
		.replace(/[\u0300-\u036f]/g, '') // Remove accents
		.replace(/[^a-z0-9\s_-]/g, '') // Remove special characters (keep spaces, underscores and hyphens)
		.replace(/[\s_]+/g, '-') // Replace spaces and underscores with hyphens
		.replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
		.replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
}

/**
 * Validates if a string is a valid slug format.
 *
 * Valid slug:
 * - Only lowercase letters (a-z), numbers (0-9), and hyphens (-)
 * - Must start and end with alphanumeric character
 * - Minimum 3 characters, maximum 63 characters (DNS limit)
 * - No consecutive hyphens
 *
 * @param slug - The slug to validate
 * @returns True if valid, false otherwise
 *
 * @example
 * isValidSlug("acme-corp") // true
 * isValidSlug("Acme-Corp") // false (uppercase)
 * isValidSlug("acme_corp") // false (underscore)
 * isValidSlug("-acme") // false (starts with hyphen)
 * isValidSlug("ab") // false (too short)
 */
export function isValidSlug(slug: string): boolean {
	const slugRegex = /^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])$/
	return slugRegex.test(slug) && !slug.includes('--')
}

/**
 * List of reserved slugs that cannot be used for organizations.
 * These are typically used for system routes, subdomains, or special purposes.
 */
export const RESERVED_SLUGS = [
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
	'documentation',
	'blog',
	'about',
	'contact',
	'terms',
	'privacy',
	'legal',
	'mail',
	'email',
	'cdn',
	'static',
	'assets',
	'images',
	'files',
	'uploads',
	'download',
	'downloads',
	'status',
	'health',
	'ping',
	'metrics',
	'monitoring',
	'analytics',
	'webhooks',
	'callback',
	'oauth',
	'sso',
	'saml'
]

/**
 * Checks if a slug is reserved and cannot be used.
 *
 * @param slug - The slug to check
 * @returns True if reserved, false otherwise
 */
export function isReservedSlug(slug: string): boolean {
	return RESERVED_SLUGS.includes(slug.toLowerCase())
}

/**
 * Generates a unique slug by appending a number if the base slug already exists.
 *
 * @param baseSlug - The base slug to start with
 * @param checkExists - Async function that checks if a slug exists
 * @param maxAttempts - Maximum number of attempts (default: 100)
 * @returns A unique slug
 * @throws Error if max attempts reached
 *
 * @example
 * const uniqueSlug = await ensureUniqueSlug(
 *   "acme-corp",
 *   async (slug) => {
 *     const org = await repository.findBySlug(slug)
 *     return org !== null
 *   }
 * )
 * // If "acme-corp" exists, returns "acme-corp-2"
 */
export async function ensureUniqueSlug(
	baseSlug: string,
	checkExists: (slug: string) => Promise<boolean>,
	maxAttempts: number = 100
): Promise<string> {
	let slug = baseSlug
	let attempt = 1

	while (await checkExists(slug)) {
		attempt++
		if (attempt > maxAttempts) {
			throw new Error(
				`Could not generate unique slug after ${maxAttempts} attempts`
			)
		}
		slug = `${baseSlug}-${attempt}`
	}

	return slug
}
