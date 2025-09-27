import { DependencyContainer } from '@/core/dependencyContainer'
import { Logger } from 'pino'

export type JobScriptPayload = Record<string, any>

export interface JobScriptContext {
	container: DependencyContainer
	logger: Logger
	jobId?: string
}

/**
 * @interface JobScriptInterface
 * @description Defines the contract for a self-contained background job script.
 * These scripts are designed for system tasks (e.g., cleanup, syncs) and are
 * executed by the worker.
 */
export interface JobScriptInterface {
	run(payload: JobScriptPayload, context: JobScriptContext): Promise<any>
}
