import { JobScriptInterface } from '@/types/jobScript/JobScriptInterface'
import { CleanUpOldSessionsJob } from './CleanUpOldSessionsJob'

export const jobScripts = {
	CleanUpOldSessionsJob
} as const

export type JobScriptKeys = keyof typeof jobScripts

// This type ensures that all registered scripts are constructable and implement the interface.
export type JobScriptsMap = {
	[K in JobScriptKeys]: new () => JobScriptInterface
}
