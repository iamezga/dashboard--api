/**
 * Email Service Types Export
 *
 * Central export point for all email service related types.
 * This makes imports cleaner throughout the application.
 *
 * @example
 * ```typescript
 * import {
 *   EmailProvider,
 *   EmailServiceInterface,
 *   EmailTemplate,
 *   TemplateEmailOptions
 * } from '@/types/services'
 * ```
 */

export type {
	EmailAttachment,
	EmailProvider,
	EmailSendOptions
} from './EmailProvider'

export type {
	EmailTemplate,
	EmailTemplateRegistry,
	RenderedEmailTemplate
} from './EmailTemplate'

export type {
	EmailServiceInterface,
	TemplateEmailOptions
} from './EmailServiceInterface'
