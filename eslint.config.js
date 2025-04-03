import dz from '@d-zero/eslint-config';
import * as typescriptParser from '@typescript-eslint/parser';
import eslintPluginSvelte from 'eslint-plugin-svelte';
import * as svelteParser from 'svelte-eslint-parser';

/**
 * @type {import('eslint').Linter.Config[]}
 */
export default [
	...dz.configs.frontend,
	...eslintPluginSvelte.configs['flat/recommended'],
	{
		rules: {
			'@typescript-eslint/no-empty-object-type': 0,
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
		rules: {
			'svelte/no-at-html-tags': 0,
		},
	},
	{
		files: ['*.mjs', '**/*.spec.{js,mjs,ts}'],
		rules: {
			'import/no-extraneous-dependencies': 0,
		},
	},
	{
		files: ['.textlintrc.js'],
		...dz.configs.commonjs,
	},
	{
		ignores: ['**/.*/**/*', '**/dist/**/*', '**/server/**/*', '**/*.d.ts'],
	},
];
