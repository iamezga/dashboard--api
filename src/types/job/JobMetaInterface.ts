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
}
