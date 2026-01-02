import { config } from './config'

/**
 * Validates the application configuration.
 * Throws an error if any configuration is invalid.
 */
export function validateConfig() {
	const auditProvider = config.get('audit.provider')
	const dbProviders = config.get('database.providers')

	if (!dbProviders.includes(auditProvider)) {
		throw new Error(
			`audit.provider="${auditProvider}" not in database.providers`
		)
	}
	// Additional validations...
}
