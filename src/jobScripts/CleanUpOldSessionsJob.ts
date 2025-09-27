import {
	JobScriptContext,
	JobScriptInterface,
	JobScriptPayload
} from '@/types/jobScript/JobScriptInterface'

export class CleanUpOldSessionsJob implements JobScriptInterface {
	public async run(
		payload: JobScriptPayload,
		context: JobScriptContext
	): Promise<any> {
		const { logger, container } = context
		const { olderThanDays = 30 } = payload

		logger.info(
			`Starting cleanup of sessions older than ${olderThanDays} days.`
		)

		// Example: const sessionRepo = container.repositoryManager.get('session');
		// await sessionRepo.deleteSessionsOlderThan(olderThanDays);
		await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate DB work

		logger.info('Session cleanup finished successfully.')
		return { success: true, cleaned: 123, date: container.libs.dayjs() } // Example result
	}
}
