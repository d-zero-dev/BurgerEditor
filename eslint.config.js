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
		// blocksのルートエントリ（dist/index.js）はNode.js（file-io / cli /
		// mcp-server）とユーザーの設定ファイルから読まれる。Reactと
		// @burger-editor/client（→ react-dom）を引き込むと、peer依存を自動
		// 導入しない環境で起動時に落ちる。Editor付きの定義は
		// `@burger-editor/blocks/editor`（src/editor.ts）側に置く
		files: [
			'packages/@burger-editor/blocks/src/index.ts',
			'packages/@burger-editor/blocks/src/items/items.ts',
			'packages/@burger-editor/blocks/src/items/*/definition.ts',
			'packages/@burger-editor/blocks/src/catalogs/**/*.ts',
		],
		rules: {
			'no-restricted-imports': [
				2,
				{
					patterns: [
						{
							group: [
								'react',
								'react/*',
								'react-dom',
								'react-dom/*',
								'@burger-editor/client',
								'@burger-editor/client/*',
							],
							message:
								'blocksのルートエントリはNode.jsから読まれるためReact / @burger-editor/clientをimportできません。Editorはeditor.tsxに置き、index.tsxで合成してください。',
						},
						{
							group: ['**/editor.js', '**/editor-items.js', '**/*/index.js'],
							message:
								'定義側からEditor付きのモジュールをimportできません。Editor付きの定義は@burger-editor/blocks/editor（src/editor.ts）から提供します。',
						},
					],
				},
			],
		},
	},
	{
		// リポジトリルートのビルドツール向けスクリプト（scripts/）は、
		// vitest.config.ts等の*.config.tsと同様にワークスペース横断解決を
		// 前提にしており、ルートpackage.jsonへの個別宣言は求めない
		files: [
			'*.mjs',
			'**/*.spec.{js,mjs,ts,tsx}',
			'**/*.config.ts',
			'scripts/**/*.{js,mjs}',
		],
		rules: {
			'import-x/no-extraneous-dependencies': 0,
		},
	},
	{
		// scripts/配下はCLIツールであり、標準出力への出力そのものが目的
		files: ['scripts/**/*.{js,mjs}'],
		rules: {
			'no-console': 0,
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
