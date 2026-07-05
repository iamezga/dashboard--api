import { Logger } from 'pino'
import { Mock, Mocked, vi } from 'vitest'
import { RepositoryManager } from '../../../core/repositoryManager'
import { Role as PrismaRoleModel } from '../../../generated/prisma/client'
import { DatabaseClientsMap } from '../../../infrastructure/databaseManager'
import { DependencyContainer } from '../../../types/core/dependencyContainer'
import { Role, RoleCreateInput } from '../entities/Role'
import { RoleRepository } from '../repository/RoleRepository'

describe('RoleRepository', () => {
	let repository: RoleRepository
	let dbMock: Partial<DatabaseClientsMap['postgres']>
	let loggerMock: Mocked<Logger>
	let repositoryManagerMock: Mocked<RepositoryManager>

	beforeEach(() => {
		dbMock = {
			role: {
				findUnique: vi.fn(),
				findFirst: vi.fn(),
				findMany: vi.fn(),
				create: vi.fn(),
				update: vi.fn()
			} as any,
			rolePermission: {
				updateMany: vi.fn(),
				createMany: vi.fn()
			} as any,
			$transaction: vi.fn(async (fn: any) => fn(dbMock)) as any
		}
		repositoryManagerMock = {
			get: vi.fn(),
			getUserRepository: vi.fn(),
			getSessionRepository: vi.fn(),
			getPermissionRepository: vi.fn(),
			getRoleRepository: vi.fn()
		} as unknown as Mocked<RepositoryManager>
		loggerMock = {
			info: vi.fn(),
			error: vi.fn(),
			warn: vi.fn(),
			debug: vi.fn()
		} as any
		const containerMock = {
			repositoryManager: repositoryManagerMock,
			logger: loggerMock
		} as unknown as DependencyContainer
		// Use constructor injection instead of setContext
		repository = new RoleRepository(dbMock as any, containerMock)
	})

	it('should return role by id', async () => {
		const prismaRole: PrismaRoleModel = {
			id: 'r1',
			organizationId: 'org1',
			name: 'Admin',
			label: 'Administrator',
			description: 'desc',
			active: true,
			config: {},
			createdAt: new Date(),
			updatedAt: new Date(),
			deletedAt: null,
			scope: 'TENANT'
		}

		;(dbMock.role!.findFirst as Mock).mockResolvedValue(prismaRole)

		const result: Role | null = await repository.findById('r1')

		expect(dbMock.role!.findFirst).toHaveBeenCalledWith({
			where: { id: 'r1', deletedAt: null }
		})
		expect(result?.id).toBe('r1')
	})

	it('should return role by id and organizationId', async () => {
		const prismaRole: PrismaRoleModel = {
			id: 'r1',
			organizationId: 'org1',
			name: 'Admin',
			label: 'Administrator',
			description: 'desc',
			active: true,
			config: {},
			createdAt: new Date(),
			updatedAt: new Date(),
			deletedAt: null,
			scope: 'TENANT'
		}

		;(dbMock.role!.findFirst as Mock).mockResolvedValue(prismaRole)

		const result: Role | null = await repository.findById('r1', 'org1')

		expect(dbMock.role!.findFirst).toHaveBeenCalledWith({
			where: { id: 'r1', deletedAt: null, organizationId: 'org1' }
		})
		expect(result?.id).toBe('r1')
	})

	it('should return null if role not found by id', async () => {
		;(dbMock.role!.findUnique as Mock).mockResolvedValue(null)

		const result = await repository.findById('missing')
		expect(result).toBeNull()
	})

	it('should return role with permissions', async () => {
		const prismaRole: any = {
			id: 'r2',
			organizationId: 'org1',
			name: 'Manager',
			label: 'Manager',
			description: 'desc',
			active: true,
			config: {},
			createdAt: new Date(),
			updatedAt: new Date(),
			deletedAt: null,
			scope: 'TENANT',
			permissions: [
				{
					permission: {
						id: 'p1',
						key: 'CAN_EDIT',
						label: 'Edit',
						description: '',
						active: true,
						config: {},
						scope: 'GLOBAL',
						createdAt: new Date(),
						updatedAt: new Date(),
						deletedAt: null
					},
					config: {}
				}
			]
		}
		;(dbMock.role!.findFirst as Mock).mockResolvedValue(prismaRole)

		const result = await repository.findByIdWithPermissions('r2')

		expect(dbMock.role!.findFirst).toHaveBeenCalledWith({
			where: { id: 'r2', deletedAt: null },
			include: expect.any(Object)
		})
		expect(result?.id).toBe('r2')
		expect(result?.rolePermissions).toHaveLength(1)
	})

	it('should return role with permissions by id and organizationId', async () => {
		const prismaRole: any = {
			id: 'r2',
			organizationId: 'org1',
			name: 'Manager',
			label: 'Manager',
			description: 'desc',
			active: true,
			config: {},
			createdAt: new Date(),
			updatedAt: new Date(),
			deletedAt: null,
			scope: 'TENANT',
			permissions: [
				{
					permission: {
						id: 'p1',
						key: 'CAN_EDIT',
						label: 'Edit',
						description: '',
						active: true,
						config: {},
						scope: 'GLOBAL',
						createdAt: new Date(),
						updatedAt: new Date(),
						deletedAt: null
					},
					config: {}
				}
			]
		}
		;(dbMock.role!.findFirst as Mock).mockResolvedValue(prismaRole)
		const result = await repository.findByIdWithPermissions('r2', 'org1')
		expect(dbMock.role!.findFirst).toHaveBeenCalledWith({
			where: { id: 'r2', deletedAt: null, organizationId: 'org1' },
			include: expect.any(Object)
		})
		expect(result?.id).toBe('r2')
	})

	it('should return null if role with permissions not found', async () => {
		;(dbMock.role!.findFirst as Mock).mockResolvedValue(null)

		const result = await repository.findByIdWithPermissions('missing')
		expect(result).toBeNull()
	})

	it('should return role by name', async () => {
		const prismaRole: PrismaRoleModel = {
			id: 'r3',
			organizationId: 'org1',
			name: 'Viewer',
			label: 'Viewer',
			description: '',
			active: true,
			config: {},
			createdAt: new Date(),
			updatedAt: new Date(),
			deletedAt: null,
			scope: 'TENANT'
		}
		;(dbMock.role!.findFirst as Mock).mockResolvedValue(prismaRole)

		const result = await repository.findByName('Viewer', 'org1')

		expect(dbMock.role!.findFirst).toHaveBeenCalledWith({
			where: { name: 'Viewer', organizationId: 'org1', deletedAt: null }
		})
		expect(result?.name).toBe('Viewer')
	})

	it('should return null if role not found by name', async () => {
		;(dbMock.role!.findFirst as Mock).mockResolvedValue(null)

		const result = await repository.findByName('NonExistent', 'org1')
		expect(result).toBeNull()
	})

	it('should create a role without permissions', async () => {
		const input: RoleCreateInput = {
			organizationId: 'org1',
			name: 'NewRole',
			label: 'Label',
			description: '',
			active: true,
			config: {}
		}
		const prismaRole: any = {
			...input,
			id: 'r4',
			createdAt: new Date(),
			updatedAt: new Date(),
			deletedAt: null
		}
		;(dbMock.role!.create as Mock).mockResolvedValue(prismaRole)

		const result = await repository.create(input)
		expect(result.id).toBe('r4')
	})

	it('should create a role with permissions', async () => {
		const input: RoleCreateInput = {
			organizationId: 'org1',
			name: 'WithPerms',
			label: 'Label',
			description: '',
			active: true,
			config: {},
			permissionKeys: ['CAN_EDIT']
		}
		repositoryManagerMock.get.mockReturnValue({
			findByKeys: vi.fn().mockResolvedValue([{ id: 'p1' }])
		} as any)

		const prismaRole: any = {
			...input,
			id: 'r5',
			createdAt: new Date(),
			updatedAt: new Date(),
			deletedAt: null
		}
		;(dbMock.role!.create as Mock).mockResolvedValue(prismaRole)

		const result = await repository.create(input)
		expect(result.id).toBe('r5')
	})

	it('should throw error if invalid permissionKeys on create', async () => {
		const input: RoleCreateInput = {
			organizationId: 'org1',
			name: 'Invalid',
			label: 'Label',
			description: '',
			active: true,
			config: {},
			permissionKeys: ['X']
		}
		repositoryManagerMock.get.mockReturnValue({
			findByKeys: vi.fn().mockResolvedValue([])
		} as any)

		await expect(repository.create(input)).rejects.toThrow(
			'One or more permission keys are invalid or not found.'
		)
	})

	it('should update a role', async () => {
		const prismaRole: any = {
			id: 'r6',
			name: 'Updated',
			organizationId: 'org1',
			label: 'lbl',
			description: '',
			active: true,
			config: {},
			createdAt: new Date(),
			updatedAt: new Date(),
			deletedAt: null
		}
		;(dbMock.role!.update as Mock).mockResolvedValue(prismaRole)

		const result = await repository.update('r6', { name: 'Updated' })
		expect(result?.name).toBe('Updated')
	})

	it('should update a role with organizationId', async () => {
		const prismaRole: any = {
			id: 'r6',
			name: 'Updated',
			organizationId: 'org1',
			label: 'lbl',
			description: '',
			active: true,
			config: {},
			createdAt: new Date(),
			updatedAt: new Date(),
			deletedAt: null
		}
		;(dbMock.role!.update as Mock).mockResolvedValue(prismaRole)

		const result = await repository.update('r6', { name: 'Updated' }, 'org1')
		expect(dbMock.role!.update).toHaveBeenCalledWith(
			expect.objectContaining({ where: { id: 'r6', organizationId: 'org1' } })
		)
		expect(result?.name).toBe('Updated')
	})

	it('should throw error if invalid permissionKeysToAdd', async () => {
		repositoryManagerMock.get.mockReturnValue({
			findByKeys: vi.fn().mockResolvedValue([])
		} as any)

		await expect(
			repository.update('r7', { permissionKeysToAdd: ['X'] })
		).rejects.toThrow()
	})

	it('should update role with permissionKeysToRemove', async () => {
		repositoryManagerMock.get.mockReturnValue({
			findByKeys: vi.fn().mockResolvedValue([{ id: 'p1' }])
		} as any)
		const prismaRole: any = {
			id: 'r8',
			name: 'WithRemovedPerms',
			organizationId: 'org1',
			label: '',
			description: '',
			active: true,
			config: {},
			createdAt: new Date(),
			updatedAt: new Date(),
			deletedAt: null
		}
		;(dbMock.role!.update as Mock).mockResolvedValue(prismaRole)

		const result = await repository.update('r8', {
			permissionKeysToRemove: ['CAN_EDIT']
		})
		expect(dbMock.rolePermission!.updateMany).toHaveBeenCalled()
		expect(result?.id).toBe('r8')
	})

	it('should delete a role (soft delete with transaction)', async () => {
		const result = await repository.delete('r9')

		expect(dbMock.$transaction).toHaveBeenCalled()
		expect(result).toBe(true)
	})

	it('should delete a role with organizationId', async () => {
		const result = await repository.delete('r9', 'org1')

		expect(dbMock.$transaction).toHaveBeenCalled()
		// We can't easily check the internal call to update inside the transaction mock,
		// but we confirm the transaction was initiated.
		expect(result).toBe(true)
	})

	it('should find all roles', async () => {
		const prismaRoles: PrismaRoleModel[] = [
			{
				id: 'r10',
				organizationId: 'org1',
				name: 'AllRoles',
				label: 'Label',
				description: '',
				active: true,
				config: {},
				createdAt: new Date(),
				updatedAt: new Date(),
				deletedAt: null,
				scope: 'TENANT'
			}
		]
		;(dbMock.role!.findMany as Mock).mockResolvedValue(prismaRoles)

		const result = await repository.findAll()
		expect(result).toHaveLength(1)
		expect(result[0].id).toBe('r10')
	})

	it('should find all roles for a specific organizationId', async () => {
		const prismaRoles: PrismaRoleModel[] = [
			{
				id: 'r10',
				organizationId: 'org1',
				name: 'AllRoles',
				label: 'Label',
				description: '',
				active: true,
				config: {},
				createdAt: new Date(),
				updatedAt: new Date(),
				deletedAt: null,
				scope: 'TENANT'
			}
		]
		;(dbMock.role!.findMany as Mock).mockResolvedValue(prismaRoles)

		const result = await repository.findAll('org1')
		expect(dbMock.role!.findMany).toHaveBeenCalledWith({
			where: { active: true, deletedAt: null, organizationId: 'org1' }
		})
		expect(result).toHaveLength(1)
	})

	it('should assign permissions to role', async () => {
		;(dbMock.role!.findFirst as Mock).mockResolvedValue({ id: 'r11' })
		await repository.assignPermissionsToRole('r11', ['p1'])

		expect(dbMock.$transaction).toHaveBeenCalled()
	})

	it('should throw when assigning permissions to a role in the wrong org', async () => {
		;(dbMock.role!.findFirst as Mock).mockResolvedValue(null)

		await expect(
			repository.assignPermissionsToRole('r11', ['p1'], 'wrong-org')
		).rejects.toThrow(
			'Role not found or does not belong to the specified organization.'
		)
	})

	it('should remove permissions from role', async () => {
		;(dbMock.role!.findFirst as Mock).mockResolvedValue({ id: 'r12' })
		await repository.removePermissionsFromRole('r12', ['p1'])

		expect(dbMock.$transaction).toHaveBeenCalled()
	})

	it('should throw when removing permissions from a role in the wrong org', async () => {
		;(dbMock.role!.findFirst as Mock).mockResolvedValue(null)

		await expect(
			repository.removePermissionsFromRole('r12', ['p1'], 'wrong-org')
		).rejects.toThrow(
			'Role not found or does not belong to the specified organization.'
		)
	})

	it('should update role with permissionKeysToAdd using upsert', async () => {
		const roleId = 'r1'
		const updateData: any = {
			label: 'Updated Role',
			permissionKeysToAdd: ['CAN_EDIT']
		}

		const permissions = [{ id: 'p1' }]
		repositoryManagerMock.get.mockReturnValue({
			findByKeys: vi.fn().mockResolvedValue(permissions)
		} as any)

		const prismaRole: any = {
			id: roleId,
			name: 'Admin',
			label: 'Updated Role',
			active: true,
			config: {},
			organizationId: null,
			createdAt: new Date(),
			updatedAt: new Date(),
			deletedAt: null
		}
		;(dbMock.role!.update as Mock).mockResolvedValue(prismaRole)

		const result = await repository.update(roleId, updateData)

		expect(dbMock.role!.update).toHaveBeenCalledWith({
			where: { id: roleId },
			data: {
				label: 'Updated Role',
				organization: undefined,
				permissions: {
					upsert: [
						{
							where: {
								roleId_permissionId: { roleId, permissionId: 'p1' }
							},
							update: { deletedAt: null },
							create: { permissionId: 'p1', config: {} }
						}
					]
				}
			}
		})
		expect(result?.id).toBe(roleId)
	})

	it('should throw error if invalid permissionKeysToRemove', async () => {
		const roleId = 'r1'
		const updateData: any = {
			label: 'Role With Invalid Remove',
			permissionKeysToRemove: ['CAN_DELETE']
		}

		repositoryManagerMock.get.mockReturnValue({
			findByKeys: vi.fn().mockResolvedValue([])
		} as any)

		await expect(repository.update(roleId, updateData)).rejects.toThrow(
			'One or more permission keys to remove are invalid or not found.'
		)
	})

	it('should create a role without organizationId', async () => {
		const input = {
			name: 'Viewer',
			label: 'Viewer Role',
			description: 'Read only',
			active: true,
			config: {},
			organizationId: undefined
		}

		const prismaRole: any = {
			...input,
			id: 'r10',
			createdAt: new Date(),
			updatedAt: new Date(),
			deletedAt: null
		}
		;(dbMock.role!.create as Mock).mockResolvedValue(prismaRole)

		const result = await repository.create(input as any)

		expect(dbMock.role!.create).toHaveBeenCalledWith({
			data: {
				...input,
				organization: undefined
			}
		})
		expect(result.id).toBe('r10')
	})

	it('should update a role without organizationId', async () => {
		const updateData: any = { label: 'Updated No Org' }

		const prismaRole: any = {
			id: 'r20',
			name: 'Editor',
			label: 'Updated No Org',
			active: true,
			config: {},
			organizationId: null,
			createdAt: new Date(),
			updatedAt: new Date(),
			deletedAt: null
		}
		;(dbMock.role!.update as Mock).mockResolvedValue(prismaRole)

		const result = await repository.update('r20', updateData)

		expect(dbMock.role!.update).toHaveBeenCalledWith({
			where: { id: 'r20' },
			data: {
				...updateData,
				organization: undefined
			}
		})
		expect(result?.label).toBe('Updated No Org')
	})

	it('should call db.role.update with correct data', async () => {
		const updateData: any = { label: 'Final Label', organizationId: 'org123' }

		const prismaRole: any = {
			id: 'r30',
			name: 'Admin',
			label: 'Final Label',
			organizationId: 'org123',
			active: true,
			config: {},
			createdAt: new Date(),
			updatedAt: new Date(),
			deletedAt: null
		}
		;(dbMock.role!.update as Mock).mockResolvedValue(prismaRole)

		const result = await repository.update('r30', updateData)

		expect(dbMock.role!.update).toHaveBeenCalledWith({
			where: { id: 'r30' },
			data: {
				label: 'Final Label',
				organizationId: 'org123',
				organization: { connect: { id: 'org123' } }
			}
		})
		expect(result?.organizationId).toBe('org123')
	})
})
