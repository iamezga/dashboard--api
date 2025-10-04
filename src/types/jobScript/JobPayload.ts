import { JobScriptKeys } from '@/jobScripts'
import { UseCaseKeys } from '@/modules'
import { AuthenticatedUser } from '@/modules/user/entities/User'

/**
 * Defines the payload structure for a job that executes a UseCase.
 */
export interface UseCaseJobPayload {
	jobType: 'useCase'
	useCaseName: UseCaseKeys
	jobData: {
		id: string
		payload: Record<string, any>
		meta: Record<string, any>
		user?: AuthenticatedUser
	}
}

/**
 * Defines the payload structure for a job that executes a self-contained JobScript.
 */
export interface JobScriptJobPayload {
	jobType: 'jobScript'
	scriptName: JobScriptKeys
	jobData: Record<string, any>
}

/**
 * Defines the payload structure for a simple, ad-hoc background task.
 */
export interface SimpleTaskJobPayload {
	jobType: 'simpleTask'
	jobData: Record<string, any>
}

/**
 * A union type representing all possible job payload structures that the worker can process.
 */
export type AnyJobPayload =
	| UseCaseJobPayload
	| JobScriptJobPayload
	| SimpleTaskJobPayload
