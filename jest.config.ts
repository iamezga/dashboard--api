import type { Config } from 'jest'

const config: Config = {
	testEnvironment: 'node',
	setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
	testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.ts$',
	testPathIgnorePatterns: [
		'/node_modules/',
		'.*\\.integration\\.test\\.ts$' // Exclude integration tests from normal runs
	],
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/src/$1'
	},
	roots: ['<rootDir>/src'],
	coverageDirectory: 'coverage',
	coverageReporters: ['json', 'lcov', 'text', 'clover'],
	collectCoverageFrom: [
		'src/**/*.ts',
		'!src/generated/prisma/**/*.ts', // Exclude prisma code
		'!src/**/*.d.ts', // Exclude type definition
		'!src/index.ts', // Exclude entry point (requires integration tests)
		'!src/worker.ts', // Exclude worker entry point (requires integration tests)
		'!src/http/app.ts', // Exclude Express app setup (requires integration tests)
		'!src/http/routes/**/*.ts', // Exclude route definitions (require E2E tests)
		'!src/infrastructure/index.ts', // Exclude barrel file
		'!src/jobScripts/index.ts', // Exclude barrel file
		'!src/services/sentry.ts', // Exclude Sentry initialization
		'!src/**/*.integration.test.ts' // Exclude integration tests
	],
	transform: {
		'^.+\\.ts$': [
			'ts-jest',
			{
				tsconfig: 'tsconfig.json'
			}
		]
	}
}

export default config
