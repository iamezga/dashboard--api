/**
 * Interface for all infrastructure providers to ensure a consistent API.
 */
export interface ProviderInterface {
	displayName: string
	connect(): Promise<any>
	disconnect(): Promise<void>
	__resetForTests(): void
}
