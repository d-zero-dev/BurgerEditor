import dz from '@d-zero/eslint-config';
import * as typescriptParser from '@typescript-eslint/parser';
import eslintPluginSvelte from 'eslint-plugin-svelte';
import * as svelteParser from 'svelte-eslint-parser';

/**
 * @type {import('eslint').Linter.Config[]}
 */
export default [
	{
		ignores: [
			'**/.*/**/*',
			'**/dist/**',
			'**/server/**/*',
			'**/node_modules/**',
			'**/*.d.ts',
		],
	},
	...dz.configs.frontend,
	...eslintPluginSvelte.configs['flat/recommended'],
	{
		rules: {
			'@typescript-eslint/no-empty-object-type': 0,
			'@typescript-eslint/no-unused-vars': [
				2,
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
			],
		},
	},
	{
		files: ['**/*.svelte'],
		languageOptions: {
			parser: svelteParser,
			parserOptions: {
				parser: typescriptParser,
				extraFileExtensions: ['.svelte'],
			},
		},
		settings: {
			'import-x/parsers': {
				'@typescript-eslint/parser': ['.ts', '.js'],
			},
		},
		rules: {
			'svelte/no-at-html-tags': 0,
		},
	},
	{
		files: ['**/*.svelte.ts'],
		languageOptions: {
			parser: typescriptParser,
		},
	},
	{
		files: ['*.mjs', '**/*.spec.{js,mjs,ts}', '**/*.config.ts'],
		rules: {
			'import-x/no-extraneous-dependencies': 0,
		},
	},
	{
		files: ['.textlintrc.js'],
		...dz.configs.commonjs,
	},
];
