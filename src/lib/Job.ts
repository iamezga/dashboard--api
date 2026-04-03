import { UserLoginDetails } from '@/modules/auth/entities/AuthDataTypes'
import { AuthenticatedUser } from '@/modules/user/entities/User'
import { JobInterface } from '@/types/job/JobInterface'
import { JobMetaInterface } from '@/types/job/JobMetaInterface'
import { Logger } from 'pino'

interface JobOptions {
	id: string
	attempts: number
	meta?: JobMetaInterface
	user?: AuthenticatedUser
	logger: Logger
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
	private data: Record<string, any> = {}
	private recaptchaResponse?: string
	private meta: JobMetaInterface
	private user?: AuthenticatedUser
	public logger: Logger

	// Event Callbacks
	private onFailCallback?: (errorId: string, err: Error, job: Job) => void
	private onCompleteCallback?: (job: Job) => void
	private onProgressCallback?: (progress: number, job: Job) => void
	private onUpdateProgressCallback?: (progress: number, job: Job) => void

	/**
	 * Creates an instance of a Job.
	 * @param {JobOptions} options - The initial options for the job, including data, user, and metadata.
	 */
	constructor(options: JobOptions) {
		this.id = options.id
		this.attempts = options.attempts
		this.meta = structuredClone(options.meta ?? ({} as JobMetaInterface))
		this.user = options.user ? structuredClone(options.user) : undefined
		this.logger = options.logger
	}

	/**
	 * Returns the unique identifier of the job.
	 * @returns {string}
	 */
	getId(): string {
		return this.id
	}

	/**
	 * Overwrites the entire metadata object for the job.
	 * @param {JobMetaInterface} meta - The new metadata object.
	 */
	setMeta(meta: JobMetaInterface): void {
		this.meta = structuredClone(meta)
	}

	/**
	 * Merges new properties into the existing metadata object.
	 * @param {Partial<JobMetaInterface>} meta - The metadata properties to update.
	 */
	updateMeta(meta: Partial<JobMetaInterface>): void {
		this.meta = structuredClone({ ...this.meta, ...meta })
	}

	/**
	 * Returns a deep clone of the job's metadata.
	 * @returns {JobMetaInterface}
	 */
	getMeta(): JobMetaInterface {
		return structuredClone(this.meta)
	}

	/**
	 * Merges new data into the job's payload.
	 * @param {Record<string, any>} data - The data to add.
	 */
	setData(data: Record<string, any>): void {
		this.data = structuredClone({ ...this.data, ...data })
	}

	/**
	 * Returns a deep clone of the job's input data.
	 * @returns {Record<string, any>}
	 */
	getData(): Record<string, any> {
		return structuredClone(this.data)
	}

	/**
	 * Sets the authenticated user for the job.
	 * @param {AuthenticatedUser} user - The authenticated user object.
	 */
	setUser(user: AuthenticatedUser): void {
		this.user = structuredClone(user)
	}

	/**
	 * Returns the full authenticated user object.
	 * @throws {Error} If user data is missing in the context.
	 * @returns {AuthenticatedUser}
	 */
	getUser(): AuthenticatedUser {
		if (!this.user) throw new Error('User data is missing in Job context')
		return structuredClone(this.user)
	}

	/**
	 * Returns a public-safe representation of the authenticated user.
	 * Includes identity fields and memberships but excludes passwordHash and internal metadata.
	 * Used primarily for audit logging and API response context.
	 * @returns {UserLoginDetails | undefined}
	 */
	getPublicUser(): UserLoginDetails | undefined {
		if (!this.user) return undefined
		// Map to UserLoginDetails DTO — excludes passwordHash and internal job state.
		return {
			id: this.user.id,
			email: this.user.email,
			name: (this.user as any).name,
			surname: (this.user as any).surname,
			memberships: (this.user as any).memberships,
			status: this.user.status,
			config: this.user.config
		}
	}

	/**
	 * Returns the number of attempts for this job.
	 * @returns {number}
	 */
	getAttempts(): number {
		return this.attempts
	}

	/**
	 * Sets the number of attempts for this job.
	 * @param {number} attempts - The new attempt count.
	 */
	setAttempts(attempts: number): void {
		this.attempts = attempts
	}

	/**
	 * Returns the current progress of the job as a percentage.
	 * @returns {number}
	 */
	getProgress(): number {
		return this.progress
	}

	/**
	 * Registers a callback to be executed when the job fails.
	 * @param {(errorId: string, err: Error, job: Job) => void} cb - The callback function.
	 */
	onFail(cb: (errorId: string, err: Error, job: Job) => void): void {
		this.onFailCallback = cb
	}

	/**
	 * Registers a callback to be executed when the job completes successfully.
	 * @param {(job: Job) => void} cb - The callback function.
	 */
	onComplete(cb: (job: Job) => void): void {
		this.onCompleteCallback = cb
	}

	/**
	 * Registers a callback to be executed when the job's progress starts.
	 * @param {(progress: number, job: Job) => void} cb - The callback function.
	 */
	onProgress(cb: (progress: number, job: Job) => void): void {
		this.onProgressCallback = cb
	}

	/**
	 * Registers a callback to be executed when the job's progress is updated.
	 * @param {(progress: number, job: Job) => void} cb - The callback function.
	 */
	onUpdateProgress(cb: (progress: number, job: Job) => void): void {
		this.onUpdateProgressCallback = cb
	}

	/**
	 * Marks the job as failed, updates its metadata, logs the error, and triggers the onFail callback.
	 * @param {string} errorId - A unique identifier for the error.
	 * @param {Error} err - The error object.
	 */
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

	/**
	 * Marks the job as completed, updates its metadata, and triggers the onComplete callback.
	 */
	markCompleted(): void {
		this.updateMeta({
			status: 'completed',
			completedAt: new Date().toISOString()
		})
		this.logger.info(`[Job ${this.id}] Completed`)
		this.onCompleteCallback?.(this)
	}

	/**
	 * Marks the job as in progress, optionally updates the progress percentage, and triggers the onProgress callback.
	 * @param {number} [progress] - The initial progress percentage.
	 */
	markInProgress(progress?: number): void {
		if (progress !== undefined) {
			this.updateProgress(progress)
		}
		this.updateMeta({
			status: 'in_progress',
			updatedAt: new Date().toISOString()
		})

		this.logger.info(`[Job ${this.id}] Progress: ${this.progress}%`)

		this.onProgressCallback?.(this.progress, this)
	}

	/**
	 * Updates the job's progress percentage and triggers the onUpdateProgress callback.
	 * @param {number} progress - The new progress percentage.
	 */
	updateProgress(progress: number): void {
		this.progress = progress
		this.onUpdateProgressCallback?.(progress, this)
	}

	/**
	 * Returns the reCAPTCHA response token, if available.
	 * @returns {string | undefined}
	 */
	getRecaptchaResponse(): string | undefined {
		return this.recaptchaResponse
	}

	/**
	 * Sets the reCAPTCHA response token for the job.
	 * @param {string} recaptchaResponse - The reCAPTCHA token.
	 */
	setRecaptchaResponse(recaptchaResponse: string): void {
		this.recaptchaResponse = recaptchaResponse
	}
}
