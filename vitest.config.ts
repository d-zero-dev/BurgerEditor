import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		exclude: ['**/node_modules/**', '**/dist/**'],
		projects: [
			{
				test: {
					name: 'default',
					include: [
						'packages/@burger-editor/{blocks,frozen-patty,legacy,mcp-server,migrator,utils}/**/*.spec.ts',
					],
					environment: 'jsdom',
					environmentOptions: {
						jsdom: {
							url: 'https://www.d-zero.co.jp',
						},
					},
				},
			},
			{
				extends: './packages/@burger-editor/client/vite.config.ts',
				test: {
					name: 'client',
					include: ['packages/@burger-editor/client/**/*.spec.ts'],
				},
			},
			{
				test: {
					name: 'custom-element',
					include: ['packages/@burger-editor/custom-element/**/*.spec.ts'],
					browser: {
						enabled: true,
						provider: 'playwright',
						instances: [{ browser: 'chromium' }],
						headless: true,
						viewport: { width: 1280, height: 720 },
						screenshotFailures: false,
					},
				},
			},
			{
				test: {
					name: 'core',
					include: ['packages/@burger-editor/core/**/*.spec.ts'],
					browser: {
						enabled: true,
						provider: 'playwright',
						instances: [{ browser: 'chromium' }],
						headless: true,
						viewport: { width: 1280, height: 720 },
						screenshotFailures: false,
					},
				},
			},
			{
				extends: './packages/@burger-editor/local/vite.config.ts',
				test: {
					name: 'local',
					include: ['packages/@burger-editor/local/**/*.spec.ts'],
				},
			},
		],
	},
});
