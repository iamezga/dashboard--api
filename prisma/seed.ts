import {
	Module,
	Organization,
	Permission,
	PermissionScope,
	Prisma,
	PrismaClient,
	Role,
	User
} from '@prisma/client'
import { hash } from 'argon2' // Use argon2 for password hashing

// Define an interface for the module data to ensure type safety
interface IModuleSeedData {
	key: string
	label: string
}

// Define an interface for the permission data to ensure type safety
interface IPermissionSeedData {
	key: string
	label: string
	description: string
	scope: PermissionScope
	moduleId?: string // Optional for GLOBAL scope permissions
	config?: Record<string, unknown> // Changed to Prisma.JsonObject for better type compatibility
	active: boolean
}

// Initialize the Prisma Client
const prisma = new PrismaClient()

async function main(): Promise<void> {
	console.log('Starting database seeding...')

	// Create/Upsert Default Organization (single-tenant setup, tenant-ready)
	const organization: Organization = await prisma.organization.upsert({
		where: { id: '00000000-0000-0000-0000-000000000001' },
		update: { name: 'Default Organization' },
		create: {
			id: '00000000-0000-0000-0000-000000000001',
			name: 'Default Organization'
		}
	})
	console.log(
		`Organization created/updated: ${organization.name} (ID: ${organization.id})`
	)

	// Create Modules
	const modulesData: IModuleSeedData[] = [
		{ key: 'users', label: 'User Management' },
		{ key: 'roles', label: 'Role Management' },
		{ key: 'permissions', label: 'Permission Management' },
		{ key: 'organizations', label: 'Organization Management' }
	]

	const createdModules: Module[] = []
	for (const moduleData of modulesData) {
		const module: Module = await prisma.module.upsert({
			where: { key: moduleData.key },
			update: {},
			create: moduleData
		})
		createdModules.push(module)
		console.log(`Module created/updated: ${module.label} (Key: ${module.key})`)
	}

	const usersModule: Module | undefined = createdModules.find(
		m => m.key === 'users'
	)
	const rolesModule: Module | undefined = createdModules.find(
		m => m.key === 'roles'
	)
	const permissionsModule: Module | undefined = createdModules.find(
		m => m.key === 'permissions'
	)
	const organizationsModule: Module | undefined = createdModules.find(
		m => m.key === 'organizations'
	)

	// Create Permissions
	// Permission keys follow the [module].[action] convention.
	const permissionsData: IPermissionSeedData[] = [
		// Global Permissions
		{
			key: 'auth.login',
			label: 'Login Authentication',
			description: 'Allows users to log into the system.',
			scope: PermissionScope.GLOBAL,
			active: true,
			config: {
				conditions: {
					timezones: {
						enabled: false,
						values: ['Europe/Madrid']
					},
					accessDays: {
						enabled: true,
						values: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
					},
					accessTime: {
						enabled: true,
						options: {
							from: '09:00',
							to: '18:00'
						}
					}
				},
				maxSessionTime: 86400, // seconds (24 hours)
				maxInactivityTime: 86400, // seconds (24 hours)
				allowMultipleSessions: true
			}
		},
		{
			key: 'admin.full_access',
			label: 'Full System Access',
			description: 'Grants total control over all system functionalities.',
			scope: PermissionScope.GLOBAL,
			active: true
		},
		{
			key: 'dashboard.view',
			label: 'View Dashboard',
			description: 'Allows viewing the main application dashboard.',
			scope: PermissionScope.GLOBAL,
			active: true
		},

		// Permissions for the 'users' module
		{
			key: 'user.create',
			label: 'Create Users',
			description: 'Allows creating new users in the system.',
			scope: PermissionScope.MODULE,
			moduleId: usersModule?.id,
			active: true
		},
		{
			key: 'user.read',
			label: 'View Users',
			description: 'Allows viewing the list and details of users.',
			scope: PermissionScope.MODULE,
			moduleId: usersModule?.id,
			active: true
		},
		{
			key: 'user.update',
			label: 'Update Users',
			description: 'Allows modifying information of existing users.',
			scope: PermissionScope.MODULE,
			moduleId: usersModule?.id,
			active: true
		},
		{
			key: 'user.delete',
			label: 'Delete Users',
			description: 'Allows deleting users from the system.',
			scope: PermissionScope.MODULE,
			moduleId: usersModule?.id,
			active: true
		},
		{
			key: 'user.manage_roles',
			label: 'Manage User Roles',
			description: 'Allows assigning and revoking roles to users.',
			scope: PermissionScope.MODULE,
			moduleId: usersModule?.id,
			active: true
		},
		{
			key: 'user.manage_permissions',
			label: 'Manage User Permissions',
			description: 'Allows managing user-level permission overrides.',
			scope: PermissionScope.MODULE,
			moduleId: usersModule?.id,
			active: true
		},

		// Permissions for the 'roles' module
		{
			key: 'role.create',
			label: 'Create Roles',
			description: 'Allows creating new roles.',
			scope: PermissionScope.MODULE,
			moduleId: rolesModule?.id,
			active: true
		},
		{
			key: 'role.read',
			label: 'View Roles',
			description: 'Allows viewing the list and details of roles.',
			scope: PermissionScope.MODULE,
			moduleId: rolesModule?.id,
			active: true
		},
		{
			key: 'role.update',
			label: 'Update Roles',
			description: 'Allows modifying information of existing roles.',
			scope: PermissionScope.MODULE,
			moduleId: rolesModule?.id,
			active: true
		},
		{
			key: 'role.delete',
			label: 'Delete Roles',
			description: 'Allows deleting roles from the system.',
			scope: PermissionScope.MODULE,
			moduleId: rolesModule?.id,
			active: true
		},
		{
			key: 'role.manage_permissions',
			label: 'Manage Role Permissions',
			description: 'Allows assigning and revoking permissions to roles.',
			scope: PermissionScope.MODULE,
			moduleId: rolesModule?.id,
			active: true
		},

		// Permissions for the 'permissions' module
		{
			key: 'permission.read',
			label: 'View Permissions',
			description: 'Allows viewing the list and details of permissions.',
			scope: PermissionScope.MODULE,
			moduleId: permissionsModule?.id,
			active: true
		},
		{
			key: 'permission.update',
			label: 'Update Permissions',
			description:
				'Allows modifying the configuration of existing permissions (e.g., config).',
			scope: PermissionScope.MODULE,
			moduleId: permissionsModule?.id,
			active: true
		},

		// Permissions for the 'organizations' module
		{
			key: 'organization.read',
			label: 'View Organizations',
			description: 'Allows viewing the list and details of organizations.',
			scope: PermissionScope.MODULE,
			moduleId: organizationsModule?.id,
			active: true
		},
		{
			key: 'organization.update',
			label: 'Update Organizations',
			description: 'Allows modifying information of existing organizations.',
			scope: PermissionScope.MODULE,
			moduleId: organizationsModule?.id,
			active: true
		}
	]

	const createdPermissions: Permission[] = []
	for (const permissionData of permissionsData) {
		const permission: Permission = await prisma.permission.upsert({
			where: { key: permissionData.key },
			update: {
				label: permissionData.label,
				description: permissionData.description,
				scope: permissionData.scope,
				moduleId: permissionData.moduleId,
				active: permissionData.active,
				// Cast config to Prisma.InputJsonValue to resolve type incompatibility
				config: permissionData.config as Prisma.InputJsonValue | undefined
			},
			create: {
				...permissionData,
				// Ensure moduleId is correctly handled as optional in create if it's undefined
				moduleId:
					permissionData.moduleId === undefined
						? null
						: permissionData.moduleId,
				config:
					permissionData.config === undefined
						? {}
						: (permissionData.config as Prisma.InputJsonValue)
			}
		})
		createdPermissions.push(permission)
		console.log(
			`Permission created/updated: ${permission.label} (Key: ${permission.key})`
		)
	}

	// Helper function to find a permission by its key, asserting it will be found
	const byKey = (k: string): Permission => {
		const perm = createdPermissions.find(p => p.key === k)
		if (!perm) {
			throw new Error(
				`Permission with key '${k}' not found. This indicates a seeding error.`
			)
		}
		return perm
	}

	// Create Roles
	const superAdminRole: Role = await prisma.role.upsert({
		where: {
			organizationId_name: {
				organizationId: organization.id,
				name: 'superAdmin'
			}
		},
		update: {
			label: 'Super Administrator',
			description: 'Role with full access and control over the system.'
		},
		create: {
			organizationId: organization.id,
			name: 'superAdmin',
			label: 'Super Administrator',
			description: 'Role with full access and control over the system.'
		}
	})
	console.log(
		`Role created/updated: ${superAdminRole.label} (ID: ${superAdminRole.id})`
	)

	const viewerRole: Role = await prisma.role.upsert({
		where: {
			organizationId_name: { organizationId: organization.id, name: 'viewer' }
		},
		update: { label: 'Viewer', description: 'Basic read-only access.' },
		create: {
			organizationId: organization.id,
			name: 'viewer',
			label: 'Viewer',
			description: 'Basic read-only access.',
			active: true
		}
	})
	console.log(
		`Role created/updated: ${viewerRole.label} (ID: ${viewerRole.id})`
	)

	// Assign all created permissions to the "Super Administrator" role
	for (const permission of createdPermissions) {
		await prisma.rolePermission.upsert({
			where: {
				roleId_permissionId: {
					roleId: superAdminRole.id,
					permissionId: permission.id
				}
			},
			update: {},
			create: {
				roleId: superAdminRole.id,
				permissionId: permission.id,
				config: {}
			}
		})
		console.log(
			`Permission '${permission.key}' assigned to role '${superAdminRole.name}'`
		)
	}

	// Assign specific permissions to the "Viewer" role
	const viewerPermissionKeys: string[] = [
		'auth.login',
		'user.read',
		'dashboard.view'
	]
	for (const key of viewerPermissionKeys) {
		const permission: Permission = byKey(key) // Using the helper for safer access
		await prisma.rolePermission.upsert({
			where: {
				roleId_permissionId: {
					roleId: viewerRole.id,
					permissionId: permission.id
				}
			},
			update: {},
			create: { roleId: viewerRole.id, permissionId: permission.id, config: {} }
		})
		console.log(
			`Permission '${permission.key}' assigned to role '${viewerRole.name}'`
		)
	}

	// Create an initial admin user
	const adminPasswordHash: string = await hash('password')
	const adminUser: User = await prisma.user.upsert({
		where: { email: 'admin@example.com' },
		update: {
			passwordHash: adminPasswordHash,
			name: 'Admin',
			surname: 'Default',
			organizationId: organization.id,
			roleId: superAdminRole.id
		},
		create: {
			name: 'Admin',
			surname: 'Default',
			email: 'admin@example.com',
			passwordHash: adminPasswordHash,
			organizationId: organization.id,
			roleId: superAdminRole.id,
			active: true,
			config: { defaultLanguage: 'en' }
		}
	})
	console.log(
		`Initial admin user created/updated: ${adminUser.email} (ID: ${adminUser.id})`
	)

	// Enable modules for the admin user
	for (const module of createdModules) {
		await prisma.userModule.upsert({
			where: { userId_moduleId: { userId: adminUser.id, moduleId: module.id } },
			update: { enabled: true },
			create: { userId: adminUser.id, moduleId: module.id, enabled: true }
		})
		console.log(`Module '${module.key}' enabled for user '${adminUser.email}'`)
	}

	console.log('Database seeding completed. ✅')
}

;(async () =>
	await main()
		.catch(async (e: Error) => {
			console.error(e)
			process.exit(1)
		})
		.finally(async () => {
			await prisma.$disconnect()
		}))()
