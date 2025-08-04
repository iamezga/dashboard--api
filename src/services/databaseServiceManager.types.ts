import { PrismaClient } from '@prisma/client'
import { Db } from 'mongodb'
import { RedisClientType } from 'redis'

export interface ConnectedDatabases {
	prisma?: PrismaClient
	redis?: RedisClientType
	mongo?: Db
}

export interface DatabaseServiceManager {
	initialize: () => Promise<void>
	shutdown: () => Promise<void>
	getDatabases: () => ConnectedDatabases
}
