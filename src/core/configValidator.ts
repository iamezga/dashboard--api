import { config } from '@/services/config'

/**
 * Validates cross-field application configuration at startup.
 * Ensures consistency between related config values.
 *
 * This validation runs before infrastructure initialization
 * to catch configuration errors early (fail-fast).
 *
 * @throws {Error} If any configuration constraint is violated.
 */
export function validateConfig() {
	//| PROVIDERS
	const auditProvider = config.get('audit.provider')
	const dbProviders = config.get('database.providers')

	if (!dbProviders.includes(auditProvider)) {
		throw new Error(
			`audit.provider="${auditProvider}" not in database.providers`
		)
	}

	//| JWT
	const jwtSecret = config.get('jwt.secret')
	const jwtExpiresIn = config.get('jwt.expiresIn')
	if (!jwtSecret || !jwtExpiresIn) {
		throw new Error('jwt.secret and jwt.expiresIn must be configured')
	}
	// Additional validations...
}
