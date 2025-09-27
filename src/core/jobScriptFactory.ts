import { JobScriptKeys, jobScripts } from '@/jobScripts'
import { JobScriptInterface } from '@/types/jobScript/JobScriptInterface'

/**
 * Instantiates and returns a job script based on its key.
 * @param {JobScriptKeys} key The key of the job script to instantiate.
 * @returns {JobScriptInterface} An instance of the requested job script.
 * @throws {Error} If the job script key is not found in the registry.
 */
export function jobScriptFactory(key: JobScriptKeys): JobScriptInterface {
	const JobScript = jobScripts[key]
	if (!JobScript) throw new Error(`Job Script with key "${key}" not found.`)
	return new JobScript()
}
