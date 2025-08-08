import { JobMetaInterface } from './JobMetaInterface'
import { JobUserInterface } from './JobUserInterface'

export interface JobInterface {
	getId(): string
	getMeta(): JobMetaInterface
	getData(): Record<string, any>
	getUser(): JobUserInterface
	getPublicUser(): Partial<JobUserInterface> | undefined

	getAttempts(): number
	getProgress(): number
	getRecaptchaResponse(): string | undefined

	setMeta(meta: JobMetaInterface): void
	updateMeta(meta: Partial<JobMetaInterface>): void
	setData(data: Record<string, any>): void
	setUser(user: JobUserInterface): void
	setAttempts(attempts: number): void
	setRecaptchaResponse(recaptchaResponse: string): void
	markFailed(errorId: string, err: Error): void
	markCompleted(): void
	updateProgress(progress: number): void
	// Events
	onFail(cb: (errorId: string, err: Error, job: JobInterface) => void): void
	onComplete(cb: (job: JobInterface) => void): void
	onProgress(cb: (progress: number, job: JobInterface) => void): void
	onUpdateProgress(cb: (progress: number, job: JobInterface) => void): void
}
