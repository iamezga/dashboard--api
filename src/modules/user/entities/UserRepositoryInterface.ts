import { DatabaseClients } from '@/services/databaseServiceManager'
import { RepositoryInterface } from '@/types/useCase/RepositoryInterface'
import { User } from './User'

export interface UserRepositoryInterface
	extends RepositoryInterface<User, DatabaseClients['postgres']> {
	readonly name?: 'UserRepository'
	// Add methods
}
