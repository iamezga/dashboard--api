import js from '@eslint/js'
import typescriptEslint from '@typescript-eslint/eslint-plugin'
import typescriptParser from '@typescript-eslint/parser'
import prettierConfig from 'eslint-config-prettier'
import prettierPlugin from 'eslint-plugin-prettier'
import globals from 'globals'

export default [
	// 1. Core ESLint recommended rules (general JS rules)
	js.configs.recommended,
	{
		files: ['src/**/*.ts'],
		languageOptions: {
			parser: typescriptParser,
			parserOptions: {
				project: './tsconfig.eslint.json',
				tsconfigRootDir: import.meta.dirname,
				sourceType: 'module'
			},

			globals: {
				...globals.node, // This includes all the global node.js (console, process, etc.)
				...globals.jest // If you plan to use Jest, include your global here too
			}
		},
		plugins: {
			'@typescript-eslint': typescriptEslint,
			prettier: prettierPlugin
		},
		rules: {
			...typescriptEslint.configs.recommended.rules,
			'no-unused-vars': 'off',
			'@typescript-eslint/no-require-imports': 'off',
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{ argsIgnorePattern: '^_' }
			],
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/explicit-module-boundary-types': 'off',
			'@typescript-eslint/no-inferrable-types': 'off',

			indent: 'off',
			'linebreak-style': ['error', 'unix'],
			quotes: ['error', 'single'],
			semi: ['error', 'never'],
			'prettier/prettier': 'error'
		},
		extends: ['prettier']
	},

	// 3. Prettier configuration to disable conflicting ESLint rules (must be last)
	prettierConfig
]
