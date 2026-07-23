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
			// @d-zero/eslint-config/base の no-restricted-syntax を維持しつつ
			// clickイベント禁止（Invoker Commands API に統一する）を追加。
			// ボタン起点のアクションは command/commandfor で宣言し、
			// 受け手が command イベントを処理する
			'no-restricted-syntax': [
				2,
				{
					selector:
						':matches(PropertyDefinition, MethodDefinition)[accessibility="private"]',
					message: 'Use #private instead',
				},
				{
					selector:
						':matches(PropertyDefinition, MethodDefinition)[accessibility="public"]',
					message: 'Remove public keyword',
				},
				{
					selector: 'MethodDefinition[key.name=/^_/]:not([accessibility="protected"])',
					message: 'Add protected keyword',
				},
				{
					selector: 'MethodDefinition:not([key.name=/^_/])[accessibility="protected"]',
					message: 'Start with `_` if you want to use protected',
				},
				{
					selector:
						"CallExpression[callee.property.name='addEventListener'][arguments.0.value='DOMContentLoaded']",
					message:
						"Avoid using 'DOMContentLoaded'. Use 'defer' or 'type=module' attribute instead.",
				},
				{
					selector: "JSXAttribute[name.name='onClick']",
					message:
						'onClickは禁止です。Invoker Commands API（command/commandfor属性 + commandイベント）を使ってください。',
				},
				{
					selector:
						"CallExpression[callee.property.name='addEventListener'][arguments.0.value='click']",
					message:
						"addEventListener('click')は禁止です。Invoker Commands API（command/commandfor属性 + commandイベント）を使ってください。",
				},
				{
					selector: "CallExpression[callee.property.name='click']",
					message:
						'プログラムによるclick()呼び出しは禁止です。ファイル選択はshowPicker()を使ってください。',
				},
			],
		},
	},
	{
		files: ['*.mjs', '**/*.spec.{js,mjs,ts}', '**/*.config.ts'],
		rules: {
			'import-x/no-extraneous-dependencies': 0,
		},
	},
	{
		// テストはユーザー操作の再現としてclickを発火してよい
		files: ['**/*.spec.{js,mjs,ts,tsx}', '**/__tests__/**/*'],
		rules: {
			'no-restricted-syntax': 0,
		},
	},
	{
		files: ['.textlintrc.js'],
		...dz.configs.commonjs,
	},
];
