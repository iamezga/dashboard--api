import { RepositoryManager } from '@/core/repositoryManager'
import { Logger } from 'pino'

export type AuditRepositoryContext = {
	repositoryManager: RepositoryManager
	logger: Logger
}
