import config from '@/services/config'
import logger from '@/services/logger'
import { PrismaClient } from '@prisma/client'

let prisma: PrismaClient | null = null

const prismaConfig = config.get('database.prisma')

export const connectPrisma = async (): Promise<PrismaClient | null> => {
	if (!prismaConfig.enabled) {
		logger.info('Prisma is disabled in configuration. Skipping connection.')
		return null
	}

	if (prisma) {
		logger.info('Prisma client already initialized.')
		return prisma
	}

	if (!prismaConfig.url) {
		logger.error('Prisma url is not configured when Prisma is enabled.')
		throw new Error('Prisma url is not configured.')
	}

	try {
		prisma = new PrismaClient({
			log: [
				{ level: 'query', emit: 'event' },
				{ level: 'error', emit: 'event' },
				{ level: 'info', emit: 'event' },
				{ level: 'warn', emit: 'event' }
			]
		})

		// Connect prisma logging
		;(prisma as any).$on('error', (e: any) => logger.error('Prisma Error:', e))
		;(prisma as any).$on('info', (e: any) => logger.info('Prisma Info:', e))
		;(prisma as any).$on('warn', (e: any) => logger.warn('Prisma Warn:', e))
		// (prisma as any).$on('query', (e: any) => logger.debug('Prisma Query:', e));

		await prisma.$connect()
		logger.info('Prisma connected successfully.')
		return prisma
	} catch (error) {
		logger.error('Failed to connect Prisma:', error)
		throw error
	}
}

export const getPrismaClient = (): PrismaClient => {
	if (!prisma) {
		throw new Error('Prisma not connected. Call connectPrisma() first.')
	}
	return prisma
}

export const disconnectPrisma = async (): Promise<void> => {
	if (prisma) {
		await prisma.$disconnect()
		prisma = null
		logger.info('Prisma disconnected.')
	}
}
