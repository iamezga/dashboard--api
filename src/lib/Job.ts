import { UserLoginDetails } from '@/modules/auth/entities/AuthDataTypes'
import { AuthenticatedUser } from '@/modules/user/entities/User'
import { JobInterface } from '@/types/job/JobInterface'
import { JobMetaInterface } from '@/types/job/JobMetaInterface'
import pino, { Logger } from 'pino'

interface JobOptions {
	id: string
	attempts: number
	data?: Record<string, any>
	recaptchaResponse?: string
	meta?: JobMetaInterface
	user?: AuthenticatedUser
	logger?: Logger
}

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

	private id: string
	private attempts: number
	private data: Record<string, any>
	private recaptchaResponse?: string
	private meta: JobMetaInterface
	private user?: AuthenticatedUser
	private logger: Logger

	// Event Callbacks
	private onFailCallback?: (errorId: string, err: Error, job: Job) => void
	private onCompleteCallback?: (job: Job) => void
	private onProgressCallback?: (progress: number, job: Job) => void
	private onUpdateProgressCallback?: (progress: number, job: Job) => void

	constructor(options: JobOptions) {
		this.id = options.id
		this.attempts = options.attempts
		this.data = structuredClone(options.data ?? {})
		this.recaptchaResponse = options.recaptchaResponse
		this.meta = structuredClone(options.meta ?? ({} as JobMetaInterface))
		this.user = options.user ? structuredClone(options.user) : undefined
		this.logger = options.logger ?? pino()
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
	setUser(user: AuthenticatedUser): void {
		this.user = structuredClone(user)
	}
	getUser(): AuthenticatedUser {
		if (!this.user) throw new Error('User data is missing in Job context')
		return structuredClone(this.user)
	}

	getPublicUser(): UserLoginDetails | undefined {
		if (!this.user) return undefined
		// Map the User to the public UserLoginDetails DTO
		// This ensures no sensitive internal data leaks and matches API response structure.
		return {
			id: this.user.id,
			organizationId: this.user.organizationId,
			email: this.user.email,
			name: (this.user as any).name,
			surname: (this.user as any).surname,
			roleId: this.user.roleId,
			active: this.user.active,
			config: this.user.config
		}
	}
	getAttempts(): number {
		return this.attempts
	}
	setAttempts(attempts: number): void {
		this.attempts = attempts
	}
	getProgress(): number {
		return this.progress
	}

	// Events: Register Callbacks
	onFail(cb: (errorId: string, err: Error, job: Job) => void): void {
		this.onFailCallback = cb
	}
	onComplete(cb: (job: Job) => void): void {
		this.onCompleteCallback = cb
	}
	onProgress(cb: (progress: number, job: Job) => void): void {
		this.onProgressCallback = cb
	}
	onUpdateProgress(cb: (progress: number, job: Job) => void): void {
		this.onProgressCallback = cb
	}

	// Methods to call events and update status
	markFailed(errorId: string, err: Error): void {
		this.updateMeta({
			status: 'failed',
			errorId,
			errorName: err.name,
			errorMessage: err.message,
			failedAt: new Date().toISOString()
		})
		this.logger.error(
			`[Job ${this.id}] Failed (${errorId}): ${err.name} - ${err.message}`
		)
		this.onFailCallback?.(errorId, err, this)
	}

	markCompleted(): void {
		this.updateMeta({
			status: 'completed',
			completedAt: new Date().toISOString()
		})
		this.logger.info(`[Job ${this.id}] Completed`)
		this.onCompleteCallback?.(this)
	}

	markInProgress(progress?: number): void {
		if (progress !== undefined) {
			this.updateProgress(progress)
		}
		this.updateMeta({
			status: 'in_progress',
			updatedAt: new Date().toISOString()
		})

		console.info(`[Job ${this.id}] Progress: ${this.progress}%`)

		this.onProgressCallback?.(this.progress, this)
	}

	updateProgress(progress: number): void {
		this.progress = progress
		this.onUpdateProgressCallback?.(progress, this)
	}

	getRecaptchaResponse(): string | undefined {
		return this.recaptchaResponse
	}
	setRecaptchaResponse(recaptchaResponse: string): void {
		this.recaptchaResponse = recaptchaResponse
	}
}
