export interface JobMetaInterface {
	[key: string]: any
	timestamp: number
	method: string
	url: string
	ip?: string
	userAgent?: string
	referer?: string
	origin?: string
	timezone?: string // Client's IANA timezone (e.g., 'Europe/Madrid') from X-Timezone header
	sessionId?: string // Active session ID, populated by authMiddleware from the session store
	executionSource?: 'http' | 'worker' | 'scheduler' | 'system' // Origin of the job execution
	initiatedBy?: 'user' | 'anonymous' | 'system' // Actor type that triggered the job
}
