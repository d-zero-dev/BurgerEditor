import { defineConfig } from 'vitest/config';

import clientPkg from './packages/@burger-editor/client/package.json' with { type: 'json' };

const jsdomConfig = {
	environment: 'jsdom',
	environmentOptions: {
		jsdom: {
			url: 'https://www.d-zero.co.jp',
		},
	},
};

export default defineConfig({
	test: {
		exclude: ['**/node_modules/**', '**/dist/**'],
		projects: [
			{
				test: {
					name: 'frozen-patty',
					include: ['packages/@burger-editor/frozen-patty/**/*.spec.ts'],
					...jsdomConfig,
				},
			},
			{
				test: {
					name: 'client',
					include: ['packages/@burger-editor/client/**/*.spec.ts'],
					...jsdomConfig,
				},
				define: {
					__DEBUG__: false,
					__BGE_VERSION__: JSON.stringify(clientPkg.version),
				},
			},
			{
				test: {
					name: 'runtime',
					include: ['packages/@burger-editor/runtime/**/*.spec.ts'],
					...jsdomConfig,
				},
			},
		],
	},
});
