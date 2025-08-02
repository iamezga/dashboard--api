import type { Config } from 'jest'

const config: Config = {
	testEnvironment: 'node',
	testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.ts$',
	preset: 'ts-jest',
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/src/$1'
	},
	roots: ['<rootDir>/src'],
	collectCoverage: true,
	coverageDirectory: 'coverage',
	coverageReporters: ['json', 'lcov', 'text', 'clover'],
	collectCoverageFrom: [
		'src/**/*.ts',
		'!src/**/*.d.ts', // Exclude type definition
		'!src/app.ts', // Exclude the main file of the app without testable logic (for now...)
		'!src/server.ts'
	],
	globals: {
		'ts-jest': {
			tsconfig: 'tsconfig.json'
		}
	}
}

export default config
