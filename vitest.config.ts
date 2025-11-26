import fs from 'node:fs';

import { playwright } from '@vitest/browser-playwright';
// @ts-ignore - rollup-plugin-string has type incompatibility with vitest's internal rollup version
import { string } from 'rollup-plugin-string';
import { defineConfig } from 'vitest/config';

const blocksPkg = JSON.parse(
	fs.readFileSync('./packages/@burger-editor/blocks/package.json', 'utf8'),
);

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
					name: 'default',
					include: [
						'packages/@burger-editor/{frozen-patty,legacy,mcp-server,migrator,utils}/**/*.spec.ts',
					],
					...jsdomConfig,
				},
			},
			{
				test: {
					name: 'blocks',
					include: ['packages/@burger-editor/blocks/**/*.spec.ts'],
					...jsdomConfig,
				},
				plugins: [string({ include: ['**/*.html', '**/*.css', '**/*.svg'] })],
				define: {
					__VERSION__: JSON.stringify(blocksPkg.version),
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
						provider: playwright(),
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
						provider: playwright(),
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
					include: [
						'packages/@burger-editor/local/**/*.spec.ts',
						'!packages/@burger-editor/local/src/import/**/*.spec.ts',
					],
				},
			},
			{
				extends: './packages/@burger-editor/local/vite.config.ts',
				test: {
					name: 'local/import',
					include: ['packages/@burger-editor/local/src/import/**/*.spec.ts'],
					...jsdomConfig,
				},
			},
		],
	},
});
