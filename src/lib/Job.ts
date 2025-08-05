import { JobInterface } from '@/types/job/JobInterface'
import { JobMetaInterface } from '@/types/job/JobMetaInterface'
import { JobUserInterface } from '@/types/job/JobUserInterface'

/**
 * The Job class serves as the central context object for a single request lifecycle.
 *
 * Responsibilities:
 * - Transporting request data (payload) and metadata.
 * - Storing authentication details (user).
 * - Use case state control (e.g., progress, status).
 *
 * By encapsulating the request data the use case will only deal with pure business logic
 *
 * The class also makes sure to deep clone data to prevent anyone from accidentally changing it,
 * keeping the data's integrity safe throughout the process.
 */
export class Job implements JobInterface {
	private progress = 0
	private recaptchaResponse?: string
	private data: Record<string, any>
	private user?: JobUserInterface
	private meta: JobMetaInterface

	constructor(
		private id: string,
		private attemptsMade: number,
		data: Record<string, any> = {},
		user?: JobUserInterface,
		meta: JobMetaInterface = {} as JobMetaInterface
	) {
		this.data = structuredClone(data)
		this.user = structuredClone(user)
		this.meta = structuredClone(meta)
	}

	getId(): string {
		return this.id
	}
	setMeta(meta: JobMetaInterface): void {
		this.meta = structuredClone(meta)
	}
	updateMeta(meta: Partial<JobMetaInterface>): void {
		this.meta = structuredClone({ ...this.meta, ...meta })
	}
	getMeta(): JobMetaInterface {
		return structuredClone(this.meta)
	}
	setData(data: Record<string, any>): void {
		this.data = structuredClone({ ...this.data, ...data })
	}
	getData(): Record<string, any> {
		return structuredClone(this.data)
	}
	setUser(user: JobUserInterface): void {
		this.user = structuredClone(user)
	}
	getUser(): JobUserInterface {
		if (!this.user) {
			throw new Error('User data is missing in Job context')
		}
		return structuredClone(this.user)
	}
	getAttemptsMade(): number {
		return this.attemptsMade
	}
	getProgress(): number {
		return this.progress
	}
	updateProgress(progress: number): void {
		this.progress = progress
	}
	getRecaptchaResponse(): string | undefined {
		return this.recaptchaResponse
	}
	setRecaptchaResponse(recaptchaResponse: string): void {
		this.recaptchaResponse = recaptchaResponse
	}
}
