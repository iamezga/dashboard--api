import * as Sentry from '@sentry/node'
import { nodeProfilingIntegration } from '@sentry/profiling-node'
import config from './config'

if (config.get('sentry.dsn')) {
	Sentry.init({
		dsn: config.get('sentry.dsn'),
		environment: config.get('env') || 'production',
		integrations: [nodeProfilingIntegration()],
		tracesSampleRate: config.get('sentry.tracesSampleRate'),
		profilesSampleRate: config.get('sentry.profilesSampleRate'),
		profileLifecycle: 'trace'
	})
}
