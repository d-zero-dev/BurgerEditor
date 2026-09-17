import fs from 'node:fs';

import babel from '@rolldown/plugin-babel';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));

// React Compilerの有効/無効を両方CIで検証するための脱出ハッチ（react.devの
// 「両方のモードで実行する」推奨に従う）。通常は常に有効
const noCompiler = process.env.BGE_NO_COMPILER === '1';

export default defineConfig(({ mode }) => ({
	build: {
		target: 'esnext',
		outDir: 'dist',
		lib: {
			entry: {
				client: 'src/index.tsx',
				ui: 'src/ui.ts',
				testing: 'src/testing/index.ts',
			},
			name: 'BgE',
			formats: ['es'],
			cssFileName: 'client',
		},
		sourcemap: true,
		minify: false,
		rollupOptions: {
			// Reactは同梱しない（peer依存）。同梱すると、blocks等の外部参照の
			// Reactと二重になり、フックのdispatcher不一致で実行時に壊れる。
			// use-sync-external-storeも同梱しない — CJSシムがトップレベルで
			// `require('react')`するため、バンドルに含めるとNodeのESM実行時に
			// 「requireが存在しない環境」エラーで落ちる（`node dist/bin.js
			// catalog-list`のようにclient/uiをNode側から読むcli/blocks経由で
			// 顕在化する）。dependenciesの実パッケージとして解決させる。
			// @testing-library/react・@testing-library/dom・vitestはtesting.js
			// からのみ参照され、テストコンテキスト以外では読み込まれない
			// （peer依存・optional）ため同様に同梱しない
			external: [
				/^react($|\/)/,
				/^react-dom($|\/)/,
				/^use-sync-external-store($|\/)/,
				/^@testing-library\//,
				/^vitest($|\/)/,
			],
		},
	},
	plugins: [
		react(),
		// react-compilerは元のJSX/hook構造を見て解析する必要があるため
		// preset内で最初に実行されなければならない（babelのpresetは記述と
		// 逆順に実行されるため、後ろに書く）。@babel/preset-typescriptは
		// このファイル自体はesbuild/oxcが処理するが、babel pluginが受け取る
		// .tsx側の型構文をパースするだけで剥がしはしないため、剥がす側の
		// presetとして別途必要
		...(noCompiler
			? []
			: [babel({ presets: ['@babel/preset-typescript', reactCompilerPreset()] })]),
		dts({
			outDir: 'dist',
			entryRoot: 'src',
			tsconfigPath: 'tsconfig.build.json',
		}),
	],
	define: {
		__VERSION__: JSON.stringify(pkg.version),
		// react/react-domはexternalだが、同梱される@burger-editor/custom-element
		// が無防備なprocess.env.NODE_ENV参照を含むため静的解決が必要
		// （欠くとブラウザ実行時に `process is not defined` で起動が壊れる）。
		// vitest（このconfigをextendsする）ではReactを開発モードのまま
		// 動かしたいので、testモードでは定義しない
		...(mode === 'test' ? {} : { 'process.env.NODE_ENV': JSON.stringify('production') }),
	},
}));
