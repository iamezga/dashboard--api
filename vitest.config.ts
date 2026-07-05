import { defineConfig } from 'vitest/config'

export default defineConfig({
	resolve: {
		tsconfigPaths: true
	},
	test: {
		environment: 'node',
		globals: true,
		include: ['src/**/*.test.ts'],
		setupFiles: ['src/setupTests.vitest.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'lcov', 'html']
		}
	}
})
