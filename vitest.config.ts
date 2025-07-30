import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		exclude: ['**/node_modules/**', '**/dist/**'],
		environment: 'jsdom',
		environmentOptions: {
			jsdom: {
				url: 'https://www.d-zero.co.jp',
			},
		},
		projects: [
			'./vitest.config.ts',
			'./packages/@burger-editor/client/vite.config.ts',
			'./packages/@burger-editor/local/vite.config.ts',
		],
	},
});
