import { config } from './config'

/**
 * Validates the application configuration.
 * Throws an error if any configuration is invalid.
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
