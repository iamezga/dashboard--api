import js from '@eslint/js'
import prettierConfig from 'eslint-config-prettier'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default [
	{
		ignores: [
			'node_modules/',
			'dist/',
			'build/',
			'.env*',
			'coverage/',
			'**/*.js',
			'**/*.mjs',
			'**/*.cjs',
			'src/generated/'
		]
	},

	// ESLINT Base configs
	js.configs.recommended,
	// The TSESLINT configuration object already includes the parser and the recommended rules.
	...tseslint.configs.recommended,

	// Optional: stricter TS rules
	// ...tseslint.configs.strict,
	// Optional: TS style rules
	// ...tseslint.configs.stylistic,

	prettierConfig,

	// Specific project configuration and custom rules
	{
		files: ['src/**/*.{ts,js,mjs,cjs}'],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				project: './tsconfig.eslint.json',
				tsconfigRootDir: import.meta.dirname,
				sourceType: 'module'
			},
			globals: {
				...globals.node,
				jest: true
			}
		},
		plugins: {
			'@typescript-eslint': tseslint.plugin
		},
		rules: {
			'no-unused-vars': 'off',
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{ argsIgnorePattern: '^_' }
			],
			'@typescript-eslint/no-require-imports': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/explicit-module-boundary-types': 'off',
			'@typescript-eslint/no-inferrable-types': 'off'
		}
	}
]
