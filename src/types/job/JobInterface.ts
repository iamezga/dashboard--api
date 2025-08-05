import { JobMetaInterface } from './JobMetaInterface'
import { JobUserInterface } from './JobUserInterface'

export interface JobInterface {
	getId(): string
	getMeta(): JobMetaInterface
	getData(): Record<string, any>
	getUser(): JobUserInterface
	getAttempts(): number
	getProgress(): number
	getRecaptchaResponse(): string | undefined

	setMeta(meta: JobMetaInterface): void
	updateMeta(meta: Partial<JobMetaInterface>): void
	setData(data: Record<string, any>): void
	setUser(user: JobUserInterface): void
	setAttempts(attempts: number): void
	updateProgress(progress: number): void
	setRecaptchaResponse(recaptchaResponse: string): void
}
