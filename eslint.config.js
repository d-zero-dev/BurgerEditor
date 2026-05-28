import dz from '@d-zero/eslint-config';

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
	{
		rules: {
			'@typescript-eslint/no-empty-object-type': 0,
			'@typescript-eslint/no-unused-vars': [
				2,
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
			],
			// v3: 移植元（PHPプロジェクト）の eslint 設定に合わせて緩和
			// admin はクラス1ファイル=PascalCase のため filename-case をオフ
			'unicorn/filename-case': 0,
			'jsdoc/check-param-names': 0,
			'jsdoc/check-tag-names': 0,
			'jsdoc/check-values': 0,
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
