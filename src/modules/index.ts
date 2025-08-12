import * as audit from './audit'
import * as user from './user'

/**
 * MODULES
 *
 * Each module represents a part of the business logic.
 *
 * A module contains:
 * - entities/ → Domain entities and contracts (interfaces).
 * - repository/ → Repository implementation for persistence (only one repository per module).
 * - useCases/ → Use cases organized by action (subfolders by verb/action).
 *
 * Example structure:
 * modules/
 *   user/
 *     entities/
 *       User.ts
 *       UserRepositoryInterface.ts
 *     repository/
 *       PostgresUserRepository.ts
 *     useCases/
 *       get/
 *         UserGetUseCase.ts
 *         UserGetJobInterface.ts
 *         userGetUseCaseRules.ts
 *         index.ts
 *       index.ts
 *     index.ts
 *
 * Use case names follow the pattern:
 *    [Module][Action]UseCase
 *
 * The `index.ts` of each module only exports:
 * - Use cases (UseCase)
 * - Business rules (Rules)
 *
 * The `index.ts` at `modules/` level merges all modules and
 * exports their rules and use cases, so they can be injected into middlewares.
 */

// Merge all modules
const allModules = {
	...audit,
	...user
}

type AllModules = typeof allModules

type RuleKeys = Extract<keyof AllModules, `${string}Rules`>
type UseCaseKeys = Extract<keyof AllModules, `${string}UseCase`>

type RulesType = {
	[K in RuleKeys]: AllModules[K]
}

type UseCasesType = {
	[K in UseCaseKeys]: AllModules[K]
}

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

export const rules = groupModules<RulesType>(allModules, key =>
	key.endsWith('Rules')
)
export const useCases = groupModules<UseCasesType>(allModules, key =>
	key.endsWith('UseCase')
)
