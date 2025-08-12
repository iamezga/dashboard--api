import { UserRepositoryInterface } from '@/modules/user/entities/UserRepositoryInterface'
import { DatabaseClients } from '@/services/databaseServiceManager'

export class PostgresUserRepository implements UserRepositoryInterface {
	constructor(readonly db: DatabaseClients['postgres']) {}
	async findById(_id: string) {
		/* ...Repository logic */
		return {}
	}
	async create(_data: any) {
		/* ...Repository logic */
		return {}
	}
	async update(_id: string, _data: any) {
		/* ...Repository logic */
		return {}
	}
	async delete(_id: string) {
		/* ...Repository logic */
		return true
	}
	async findAll() {
		/* ...Repository logic */
		return []
	}
}
