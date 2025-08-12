import { DatabaseClients } from '@/services/databaseServiceManager'
import { AuditRepositoryInterface } from '../entities/AuditRepositoryInterface'

export class MongoAuditRepository implements AuditRepositoryInterface {
	constructor(readonly db: DatabaseClients['mongo']) {}
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
