import * as example from './example'

/**
 * MODULES
 * To define the use cases, an organization is defined in modules and sub modules.
 * This structure will group related use cases in the same business logic
 * and will also facilitate exports.
 * The structure will always be
 * - modules/
 * 		- example/
 * 			- get/
 * 				- ExampleGetUseCase.ts
 * 				- ExampleGetJobInterface.ts
 * 				- exampleGetUseCaseRules.ts
 * 				- index.ts
 *
 * The name of the use case will also be defined based on the structure
 * UseCase name: `[module][action]UseCase`
 *
 * The export will be staggered towards `modules/` through index.ts files and in these exports
 * only rules and use cases will be included.
 * The index of `modules/` will be responsible for grouping the rules and use cases, and will export them
 * to be used by the corresponding middlewares
 */

// Merge all modules
const allModules = {
	...example
}

type AllModules = typeof allModules

type RuleKeys = {
	[K in keyof AllModules]: K extends `${string}Rules` ? K : never
}[keyof AllModules]

type UseCaseKeys = {
	[K in keyof AllModules]: K extends `${string}UseCase` ? K : never
}[keyof AllModules]

type RulesType = { [K in RuleKeys]: AllModules[K] }
type UseCasesType = { [K in UseCaseKeys]: AllModules[K] }

type GroupedModules = {
	rules: Partial<RulesType>
	useCases: Partial<UseCasesType>
}

export const { rules, useCases } = Object.entries(
	allModules
).reduce<GroupedModules>(
	(acc, [key, imported]) => {
		if (key.endsWith('Rules')) {
			acc.rules[key as RuleKeys] = imported as RulesType[RuleKeys]
		} else if (key.endsWith('UseCase')) {
			acc.useCases[key as UseCaseKeys] = imported as UseCasesType[UseCaseKeys]
		}
		return acc
	},
	{
		rules: {},
		useCases: {}
	}
)
