import { config } from '@/services/config'
import logger from '@/services/logger'
import { Queue } from 'bullmq'
import { Bullmq, QUEUE_NAMES, QueueName } from './providers/Bullmq'

export type QueueMap = {
	[K in QueueName]: Queue
}

export interface QueueManager {
	initialize(): Promise<void>
	get<K extends QueueName>(name: K): QueueMap[K]
	getAll(): QueueMap
	shutdown(): Promise<void>
}

const bullmqProvider = new Bullmq(config.get('database.redis'), logger)

const initializedQueues: Partial<QueueMap> = {}

export const queueManager: QueueManager = {
	async initialize() {
		await bullmqProvider.connect()
		for (const name of QUEUE_NAMES) {
			initializedQueues[name] = bullmqProvider.getQueue(name)
		}
	},
	get<K extends QueueName>(name: K): QueueMap[K] {
		const queue = initializedQueues[name]
		if (!queue) throw new Error(`Queue "${name}" not found.`)
		return queue as QueueMap[K]
	},
	getAll(): QueueMap {
		return initializedQueues as QueueMap
	},
	async shutdown(): Promise<void> {
		await bullmqProvider.disconnect()
		// Clear internal state for test isolation
		Object.keys(initializedQueues).forEach(
			key => delete initializedQueues[key as QueueName]
		)
	}
}
