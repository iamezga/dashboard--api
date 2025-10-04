import { RepositoryManager } from '@/core/repositoryManager'
import { DatabaseManager } from '@/infrastructure/databaseManager'
import { AuditService } from '@/services/auditService'
import { Config } from '@/services/config'
import { Dayjs } from '@/services/dayjs'
import { JobService } from '@/services/jobService'
import { LogEmailService } from '@/services/LogEmailService'
import { ValidationService } from '@/services/validationService'
import { UtilityMap } from '@/utils'
import { Logger } from 'pino'
import { Argon2, JWT, MS } from '../libs'

export interface Services {
	auditService: AuditService
	jobService: JobService
	emailService: LogEmailService
}
export interface Libs {
	dayjs: Dayjs
	argon2: Argon2
	jwt: JWT
	ms: MS
}

export interface DependencyContainer {
	config: Config
	validator: ValidationService
	logger: Logger
	databaseManager: DatabaseManager
	repositoryManager: RepositoryManager
	services: Services
	libs: Libs
	utils: UtilityMap
}
