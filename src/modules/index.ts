import * as audit from './audit'
import * as auth from './auth'
import * as permission from './permission'
import * as role from './role'
import * as user from './user'

/**
 * @file index.ts (src/modules/)
 * @description Centralizes the loading and exposure of all application modules.
 * This file serves as the main entry point for consuming Use Cases and validation Rules
 * from different business domains across the application, especially for middlewares.
 *
 * Each module (`audit`, `auth`, `user`, etc.) encapsulates a specific business logic domain.
 *
 * @example Module Folder Structure
 * ```
 * modules/
 * ├── {module-name}/
 * │   ├── entities/                     # Domain entities and specific DTOs
 * │   │   ├── {Entity}.ts               # e.g., User.ts
 * │   │   └── {Module}DataTypes.ts      # e.g., AuthDataTypes.ts (for module-specific DTOs/types)
 * │   ├── repository/                   # Repository implementation for data persistence
 * │   │   └── {DBPrefix}{Entity}Repository.ts # e.g., PostgresUserRepository.ts
 * │   ├── useCases/                     # Business logic encapsulated in use cases
 * │   │   ├── {action-verb}/            # Subfolders by action verb (e.g., get, create, login)
 * │   │   │   ├── {Module}{Action}UseCase.ts      # Main Use Case class
 * │   │   │   ├── {Module}{Action}JobInterface.ts # Specific Job interface for this Use Case
 * │   │   │   └── {module}{Action}UseCaseRules.ts # Validation rules for Use Case input
 * │   │   └── index.ts                  # Exports all from {action-verb} folder
 * │   └── index.ts                      # Exports all from 'useCases' and 'repository' (interfaces)
 * └── index.ts                          # This file: merges all modules
 * ```
 *
 * Use Case names follow the pattern: `[Module][Action]UseCase` (e.g., `AuthLoginUseCase`).
 * Rule names follow the pattern: `[module][Action]UseCaseRules` (e.g., `authLoginUseCaseRules`).
 *
 * The `index.ts` at `modules/` level (this file) merges all modules and
 * exports their rules and use cases, making them discoverable and injectable into middlewares.
 */

// Merge all module exports into a single object for dynamic processing
const allModules = {
	...auth,
	...audit,
	...user,
	...permission,
	...role
}

type AllModules = typeof allModules

// Dynamically extract keys ending with 'Rules' for validation schemas
type RuleKeys = Extract<keyof AllModules, `${string}Rules`>
type UseCaseKeys = Extract<keyof AllModules, `${string}UseCase`>

// Dynamically extract keys ending with 'Rules' for validation schemas
type RulesType = { [K in RuleKeys]: AllModules[K] }
type UseCasesType = { [K in UseCaseKeys]: AllModules[K] }

/**
 * @function groupModules
 * @description Helper function to dynamically filter and group module exports
 * into specific categories (e.g., 'rules', 'useCases').
 * @template T - The target type for the grouped modules.
 * @param {Record<string, unknown>} modules - An object containing all module exports.
 * @param {(key: string) => boolean} filter - A predicate function to determine which keys to include.
 * @returns {Partial<T>} An object with the filtered and grouped module exports.
 */
function groupModules<T extends object>(
	modules: Record<string, unknown>,
	filter: (key: string) => boolean
): Partial<T> {
	return Object.entries(modules).reduce((acc, [key, val]) => {
		if (filter(key)) {
			;(acc as any)[key] = val
		}
		return acc
	}, {} as Partial<T>)
}

/**
 * @const rules
 * @description Exports a consolidated object of all validation rule schemas from across the application's modules.
 * This object is used by `validationMiddleware` to retrieve the correct rules for an incoming request.
 */
export const rules = groupModules<RulesType>(allModules, key =>
	key.endsWith('Rules')
)

/**
 * @const useCases
 * @description Exports a consolidated object of all UseCase classes from across the application's modules.
 * This object is used by `useCaseMiddleware` to dynamically instantiate and execute
 * the appropriate business logic for an incoming request.
 */
export const useCases = groupModules<UseCasesType>(allModules, key =>
	key.endsWith('UseCase')
)
