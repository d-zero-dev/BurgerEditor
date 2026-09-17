import dz from '@d-zero/eslint-config';
import reactHooks from 'eslint-plugin-react-hooks';

// @d-zero/eslint-config/base の no-restricted-syntax セレクタを複製せず継承する
const baseNoRestrictedSyntax =
	dz.configs.frontend
		.map((config) => config.rules?.['no-restricted-syntax'])
		.find(Boolean)
		?.slice(1) ?? [];

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
			'**/storybook-static/**',
		],
	},
	...dz.configs.frontend,
	{
		files: ['**/*.{jsx,tsx}', '**/use-*.{ts,tsx}'],
		...reactHooks.configs.flat['recommended-latest'],
	},
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
				...baseNoRestrictedSyntax,
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
				{
					selector:
						"CallExpression[callee.name='createItem'] Property[key.name='Editor'][method=true]",
					message:
						'createItem()のEditorはオブジェクトメソッド省略記法（Editor(props){...}）にせず、名前付きトップレベル関数として切り出しEditor: XxxEditorで参照してください。React Compilerはオブジェクトメソッド省略記法をコンポーネントとして認識せず、診断ログにも出ずに静かに最適化対象から外れます。',
				},
			],
		},
	},
	{
		// リポジトリルートのビルドツール向けスクリプト（scripts/）は、
		// vitest.config.ts等の*.config.tsと同様にワークスペース横断解決を
		// 前提にしており、ルートpackage.jsonへの個別宣言は求めない
		files: ['*.mjs', '**/*.spec.{js,mjs,ts,tsx}', '**/*.config.ts', 'scripts/**/*.js'],
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
