import { Permission as PrismaPermissionModel } from '@prisma/client'
import { Logger } from 'pino'
import { RepositoryManager } from '../../../core/repositoryManager'
import { DatabaseClientsMap } from '../../../infrastructure/databaseManager'
import { DependencyContainer } from '../../../types/core/dependencyContainer'
import {
	Permission,
	PermissionCreateInput,
	PermissionUpdateInput
} from '../entities/Permission'
import { PermissionRepository } from '../repository/PermissionRepository'

describe('PermissionRepository', () => {
	let repository: PermissionRepository
	let dbMock: Partial<DatabaseClientsMap['postgres']>
	let repositoryManagerMock: jest.Mocked<RepositoryManager>
	let loggerMock: jest.Mocked<Logger>
	let containerMock: DependencyContainer

	beforeEach(() => {
		dbMock = {
			permission: {
				findUnique: jest.fn(),
				findMany: jest.fn(),
				create: jest.fn(),
				update: jest.fn()
			} as any
		}

		repositoryManagerMock = {
			getUserRepository: jest.fn(),
			getSessionRepository: jest.fn(),
			getPermissionRepository: jest.fn(),
			getRoleRepository: jest.fn()
		} as unknown as jest.Mocked<RepositoryManager>

		loggerMock = {
			info: jest.fn(),
			error: jest.fn(),
			warn: jest.fn(),
			debug: jest.fn()
		} as any

		containerMock = {
			repositoryManager: repositoryManagerMock,
			logger: loggerMock
		} as unknown as DependencyContainer

		repository = new PermissionRepository(dbMock as any)
		repository.setContext(containerMock)
	})

	it('should set context and log info', () => {
		expect(loggerMock.info).toHaveBeenCalledWith('Repository context ready.')
	})

	it('should return permission by id', async () => {
		const prismaPermission: PrismaPermissionModel = {
			id: 'p1',
			key: 'CAN_VIEW',
			label: 'Can View',
			description: 'Permission to view',
			active: true,
			config: {},
			moduleId: 'mod1',
			scope: 'GLOBAL',
			createdAt: new Date(),
			updatedAt: new Date(),
			deletedAt: null
		} as any

		;(dbMock.permission!.findUnique as jest.Mock).mockResolvedValue(
			prismaPermission
		)

		const result: Permission | null = await repository.findById('p1')

		expect(dbMock.permission!.findUnique).toHaveBeenCalledWith({
			where: { id: 'p1', deletedAt: null }
		})
		expect(result?.id).toBe('p1')
	})

	it('should return null if permission not found by id', async () => {
		;(dbMock.permission!.findUnique as jest.Mock).mockResolvedValue(null)

		const result = await repository.findById('missing')
		expect(result).toBeNull()
	})

	it('should return permission by key', async () => {
		const prismaPermission: PrismaPermissionModel = {
			id: 'p2',
			key: 'CAN_EDIT',
			label: 'Can Edit',
			description: '',
			active: true,
			config: {},
			moduleId: 'mod1',
			scope: 'GLOBAL',
			createdAt: new Date(),
			updatedAt: new Date(),
			deletedAt: null
		} as any

		;(dbMock.permission!.findUnique as jest.Mock).mockResolvedValue(
			prismaPermission
		)

		const result = await repository.findByKey('CAN_EDIT')
		expect(dbMock.permission!.findUnique).toHaveBeenCalledWith({
			where: { key: 'CAN_EDIT', deletedAt: null }
		})
		expect(result?.key).toBe('CAN_EDIT')
	})

	it('should return null if permission not found by key', async () => {
		;(dbMock.permission!.findUnique as jest.Mock).mockResolvedValue(null)

		const result = await repository.findByKey('NON_EXISTENT_KEY')
		expect(result).toBeNull()
	})

	it('should return permissions by keys', async () => {
		const prismaPermissions: PrismaPermissionModel[] = [
			{
				id: 'p1',
				key: 'CAN_VIEW',
				label: 'View',
				description: '',
				active: true,
				config: {},
				moduleId: 'mod1',
				scope: 'GLOBAL',
				createdAt: new Date(),
				updatedAt: new Date(),
				deletedAt: null
			} as any,
			{
				id: 'p2',
				key: 'CAN_EDIT',
				label: 'Edit',
				description: '',
				active: true,
				config: {},
				moduleId: 'mod1',
				scope: 'GLOBAL',
				createdAt: new Date(),
				updatedAt: new Date(),
				deletedAt: null
			} as any
		]

		;(dbMock.permission!.findMany as jest.Mock).mockResolvedValue(
			prismaPermissions
		)

		const result = await repository.findByKeys(['CAN_VIEW', 'CAN_EDIT'])
		expect(result).toHaveLength(2)
		expect(dbMock.permission!.findMany).toHaveBeenCalledWith({
			where: {
				key: { in: ['CAN_VIEW', 'CAN_EDIT'] },
				active: true,
				deletedAt: null
			}
		})
	})

	it('should create a permission', async () => {
		const input: PermissionCreateInput = {
			key: 'CAN_DELETE',
			label: 'Delete',
			description: 'Can delete',
			active: true,
			config: {},
			moduleId: 'mod1',
			scope: 'GLOBAL'
		}

		const prismaPermission: PrismaPermissionModel = {
			...input,
			id: 'p3',
			createdAt: new Date(),
			updatedAt: new Date(),
			deletedAt: null
		} as any

		;(dbMock.permission!.create as jest.Mock).mockResolvedValue(
			prismaPermission
		)

		const result = await repository.create(input)
		expect(dbMock.permission!.create).toHaveBeenCalledWith({ data: input })
		expect(result.id).toBe('p3')
	})

	it('should update a permission', async () => {
		const updateData: PermissionUpdateInput = { label: 'Updated Label' }
		const prismaPermission: PrismaPermissionModel = {
			id: 'p3',
			key: 'CAN_DELETE',
			label: 'Updated Label',
			description: '',
			active: true,
			config: {},
			moduleId: 'mod1',
			scope: 'GLOBAL',
			createdAt: new Date(),
			updatedAt: new Date(),
			deletedAt: null
		} as any

		;(dbMock.permission!.update as jest.Mock).mockResolvedValue(
			prismaPermission
		)

		const result = await repository.update('p3', updateData)
		expect(dbMock.permission!.update).toHaveBeenCalledWith({
			where: { id: 'p3' },
			data: updateData
		})
		expect(result?.label).toBe('Updated Label')
	})

	it('should return null if update does not find permission', async () => {
		const updateData: PermissionUpdateInput = { label: 'New Label' }
		;(dbMock.permission!.update as jest.Mock).mockResolvedValue(null)

		const result = await repository.update('NON_EXISTENT_ID', updateData)
		expect(result).toBeNull()
	})

	it('should delete a permission (soft delete)', async () => {
		;(dbMock.permission!.update as jest.Mock).mockResolvedValue({
			id: 'p4'
		} as any)

		const result = await repository.delete('p4')
		expect(dbMock.permission!.update).toHaveBeenCalledWith({
			where: { id: 'p4' },
			data: { deletedAt: expect.any(Date) },
			select: { id: true }
		})
		expect(result).toBe(true)
	})

	it('should find all active permissions', async () => {
		const prismaPermissions: PrismaPermissionModel[] = [
			{
				id: 'p1',
				key: 'CAN_VIEW',
				label: 'View',
				description: '',
				active: true,
				config: {},
				moduleId: 'mod1',
				scope: 'GLOBAL',
				createdAt: new Date(),
				updatedAt: new Date(),
				deletedAt: null
			} as any
		]

		;(dbMock.permission!.findMany as jest.Mock).mockResolvedValue(
			prismaPermissions
		)

		const result = await repository.findAll()
		expect(dbMock.permission!.findMany).toHaveBeenCalledWith({
			where: { active: true, deletedAt: null }
		})
		expect(result).toHaveLength(1)
		expect(result[0].id).toBe('p1')
	})
})
