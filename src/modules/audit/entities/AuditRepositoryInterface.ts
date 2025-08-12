import { DatabaseClients } from '@/services/databaseServiceManager'
import { RepositoryInterface } from '@/types/useCase/RepositoryInterface'
import { Audit } from './Audit'

export interface AuditRepositoryInterface
	extends RepositoryInterface<Audit, DatabaseClients['mongo']> {
	readonly name?: 'AuditRepository'
	// Add methods
}
