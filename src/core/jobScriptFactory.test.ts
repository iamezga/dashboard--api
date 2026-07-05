import { vi } from 'vitest'
const { FakeJobScript } = vi.hoisted(() => {
	class FakeJobScript {
		run(): Promise<any> {
			return Promise.resolve({ success: true, from: 'fake' })
		}
	}

	return { FakeJobScript }
})

import { jobScriptFactory } from './jobScriptFactory'

vi.mock('@/jobScripts', () => ({
	jobScripts: {
		CleanUpOldSessionsJob: FakeJobScript
	}
}))

describe('jobScriptFactory', () => {
	it('should return an instance of the correct job script for a valid key', () => {
		const script = jobScriptFactory('CleanUpOldSessionsJob')

		expect(script).toBeInstanceOf(FakeJobScript)
		expect(typeof script.run).toBe('function')
	})

	it('should throw an error if the job script key is not found', () => {
		const invalidKey = 'NonExistentJobScript'
		expect(() => jobScriptFactory(invalidKey as any)).toThrow(
			`Job Script with key "${invalidKey}" not found.`
		)
	})
})
