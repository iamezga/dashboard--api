import {
	Module,
	Organization,
	OrganizationScope,
	Permission,
	PermissionScope,
	Prisma,
	PrismaClient,
	Role,
	RoleScope
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
	config?: Record<string, unknown>
	active: boolean
}

// Initialize the Prisma Client
const prisma = new PrismaClient()

async function main(): Promise<void> {
	console.log('Starting database seeding...')

	// --- CREATE ORGANIZATIONS ---
	console.log('\n--- Creating Organizations ---')
	const systemOrganization: Organization = await prisma.organization.upsert({
		where: { id: '00000000-0000-0000-0000-000000000001' }, // A unique, identifiable name
		update: {},
		create: {
			name: 'System Administration',
			scope: OrganizationScope.SYSTEM
		}
	})
	console.log(
		`System Organization created/updated: ${systemOrganization.name} (ID: ${systemOrganization.id})`
	)

	const tenantOrg1: Organization = await prisma.organization.upsert({
		where: { id: '00000000-0000-0000-0000-000000000002' },
		update: { name: 'Quantum Dynamics' },
		create: { name: 'Innovatech Solutions', scope: OrganizationScope.TENANT }
	})
	const tenantOrg2: Organization = await prisma.organization.upsert({
		where: { id: '00000000-0000-0000-0000-000000000003' },
		update: {},
		create: { name: 'Quantum Dynamics', scope: OrganizationScope.TENANT }
	})
	console.log(
		`Tenant organizations created/updated: ${tenantOrg1.name}, ${tenantOrg2.name}`
	)

	// --- CREATE MODULES ---
	console.log('\n--- Creating Modules ---')
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

	// --- CREATE PERMISSIONS ---
	console.log('\n--- Creating Permissions ---')
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
						values: [
							'Monday',
							'Tuesday',
							'Wednesday',
							'Thursday',
							'Friday',
							'Saturday',
							'Sunday'
						]
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
			key: 'dashboard.view',
			label: 'View Dashboard',
			description: 'Allows viewing the main application dashboard.',
			scope: PermissionScope.GLOBAL,
			active: true
		},

		// System-level Permissions
		{
			key: 'system.organization.create',
			label: 'Create New Organizations',
			description: 'Allows creating new tenant organizations in the system.',
			scope: PermissionScope.SYSTEM,
			active: true
		},
		{
			key: 'system.analytics.view',
			label: 'View Platform Analytics',
			description: 'Allows viewing aggregated, non-sensitive system analytics.',
			scope: PermissionScope.SYSTEM,
			active: true
		},
		{
			key: 'system.user.impersonate',
			label: 'Impersonate User',
			description:
				'Allows logging in as another user for support purposes. HIGHLY SENSITIVE.',
			scope: PermissionScope.SYSTEM,
			active: true
		},

		// Module Permissions
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
				config: (permissionData.config as Prisma.InputJsonValue) || {}
			},
			create: {
				...permissionData,
				moduleId: permissionData.moduleId || null,
				config: (permissionData.config as Prisma.InputJsonValue) || {}
			}
		})
		createdPermissions.push(permission)
		console.log(
			`Permission created/updated: ${permission.label} (Key: ${permission.key})`
		)
	}

	// Helper function to find a permission by its key
	const byKey = (k: string): Permission => {
		const perm = createdPermissions.find(p => p.key === k)
		if (!perm) {
			throw new Error(`Seeding Error: Permission with key '${k}' not found.`)
		}
		return perm
	}

	// --- CREATE ROLES ---
	console.log('\n--- Creating Roles ---')

	// System Role
	const superAdminRole = await prisma.role.upsert({
		where: {
			organizationId_name: {
				organizationId: systemOrganization.id,
				name: 'superAdmin'
			}
		},
		update: {},
		create: {
			organizationId: systemOrganization.id,
			name: 'superAdmin',
			label: 'Super Administrator',
			description: 'Has full control over the entire platform.',
			scope: RoleScope.SYSTEM
		}
	})
	console.log(`System Role created: ${superAdminRole.name}`)

	// Tenant Roles (provisioned for each tenant)
	const tenantRoles: Record<
		string,
		{ admin: Role; editor: Role; viewer: Role }
	> = {}
	for (const org of [tenantOrg1, tenantOrg2]) {
		const adminRole = await prisma.role.upsert({
			where: {
				organizationId_name: { organizationId: org.id, name: 'admin' }
			},
			update: {},
			create: {
				organizationId: org.id,
				name: 'admin',
				label: 'Administrator',
				description: 'Manages the organization, users, and roles.',
				scope: RoleScope.TENANT
			}
		})

		const editorRole = await prisma.role.upsert({
			where: {
				organizationId_name: { organizationId: org.id, name: 'editor' }
			},
			update: {},
			create: {
				organizationId: org.id,
				name: 'editor',
				label: 'Editor',
				description: 'Can create and manage content.',
				scope: RoleScope.TENANT
			}
		})

		const viewerRole = await prisma.role.upsert({
			where: {
				organizationId_name: { organizationId: org.id, name: 'viewer' }
			},
			update: {},
			create: {
				organizationId: org.id,
				name: 'viewer',
				label: 'Viewer',
				description: 'Has read-only access to content.',
				scope: RoleScope.TENANT
			}
		})

		tenantRoles[org.id] = {
			admin: adminRole,
			editor: editorRole,
			viewer: viewerRole
		}
		console.log(`Roles created for organization: ${org.name}`)
	}

	// --- ASSIGN PERMISSIONS TO ROLES ---
	console.log('\n--- Assigning Permissions to Roles ---')

	// Super Admin gets all permissions
	await prisma.rolePermission.createMany({
		data: createdPermissions.map(p => ({
			roleId: superAdminRole.id,
			permissionId: p.id
		})),
		skipDuplicates: true
	})
	console.log(`All permissions assigned to role: ${superAdminRole.name}`)

	// Assign permissions for tenant roles (example setup)
	const adminPermissions = ['user.create', 'user.read', 'user.update']
	const editorPermissions = ['user.read']
	const viewerPermissions = ['dashboard.view']

	for (const org of [tenantOrg1, tenantOrg2]) {
		const roles = tenantRoles[org.id]

		await prisma.rolePermission.createMany({
			data: adminPermissions.map(key => ({
				roleId: roles.admin.id,
				permissionId: byKey(key).id
			})),
			skipDuplicates: true
		})
		await prisma.rolePermission.createMany({
			data: editorPermissions.map(key => ({
				roleId: roles.editor.id,
				permissionId: byKey(key).id
			})),
			skipDuplicates: true
		})
		await prisma.rolePermission.createMany({
			data: viewerPermissions.map(key => ({
				roleId: roles.viewer.id,
				permissionId: byKey(key).id
			})),
			skipDuplicates: true
		})
		console.log(`Permissions assigned for roles in: ${org.name}`)
	}

	// --- CREATE USERS ---
	console.log('\n--- Creating Users ---')
	const password = await hash('password')

	// System User
	await prisma.user.upsert({
		where: { email: 'superadmin@system.io' },
		update: {
			passwordHash: password
		},
		create: {
			name: 'Super',
			surname: 'Admin',
			email: 'superadmin@system.io',
			passwordHash: password,
			organizationId: systemOrganization.id,
			roleId: superAdminRole.id
		}
	})
	console.log(
		`System user created: superadmin@system.io (Role: ${superAdminRole.name})`
	)

	// Tenant Users
	for (const org of [tenantOrg1, tenantOrg2]) {
		const roles = tenantRoles[org.id]
		const orgSuffix = org.name.split(' ')[0].toLowerCase()

		await prisma.user.upsert({
			where: { email: `admin@${orgSuffix}.com` },
			update: {},
			create: {
				name: 'Org Admin',
				email: `admin@${orgSuffix}.com`,
				passwordHash: password,
				organizationId: org.id,
				roleId: roles.admin.id
			}
		})
		console.log(
			`Admin user created for ${org.name}: admin@${orgSuffix}.com (Role: ${roles.admin.name})`
		)
		await prisma.user.upsert({
			where: { email: `editor@${orgSuffix}.com` },
			update: {},
			create: {
				name: 'Org Editor',
				email: `editor@${orgSuffix}.com`,
				passwordHash: password,
				organizationId: org.id,
				roleId: roles.editor.id
			}
		})
		console.log(
			`Editor user created for ${org.name}: editor@${orgSuffix}.com (Role: ${roles.editor.name})`
		)
		await prisma.user.upsert({
			where: { email: `viewer@${orgSuffix}.com` },
			update: {},
			create: {
				name: 'Org Viewer',
				email: `viewer@${orgSuffix}.com`,
				passwordHash: password,
				organizationId: org.id,
				roleId: roles.viewer.id
			}
		})
		console.log(
			`Viewer user created for ${org.name}: viewer@${orgSuffix}.com (Role: ${roles.viewer.name})`
		)
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
