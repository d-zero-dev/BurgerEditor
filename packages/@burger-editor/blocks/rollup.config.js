import fs from 'node:fs';

import { defineConfig } from 'rollup';
import esbuild from 'rollup-plugin-esbuild';
import { string } from 'rollup-plugin-string';

import {
	createReactCompilerBabelPlugin,
	reactCompilerDisabled,
} from '../../../scripts/react-compiler-babel.js';

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));

/**
 * 依存パッケージはバンドルに含めず実行時に解決する。`react` / `react-dom` /
 * `@burger-editor/client` は`dist/editor.js`だけが参照する。`dist/index.js`
 * （Node.jsとユーザーの設定ファイルから読まれる）から辿れるチャンクが
 * これらを import しないことは `yarn verify:blocks-boundary` が検査する。
 */
const EXTERNAL = /^(?:react|@burger-editor\/|@d-zero\/)/;

export default defineConfig([
	{
		input: {
			index: './src/index.ts',
			editor: './src/editor.ts',
		},
		external: (id) => EXTERNAL.test(id),
		output: {
			dir: './dist',
			format: 'esm',
			entryFileNames: '[name].js',
			chunkFileNames: 'chunks/[name]-[hash].js',
		},
		plugins: [
			string({ include: ['**/*.html', '**/*.css', '**/*.svg'] }),
			// react-compilerは元のJSX/hook構造を見て解析する必要があるため
			// esbuildによるJSX→createElement変換より前（pluginsの並びは記述順に
			// 実行される）で、かつ型構文をパースできる状態で動かす。
			// @babel/preset-typescriptは型を剥がすだけでJSXはそのまま残す
			...(reactCompilerDisabled ? [] : [createReactCompilerBabelPlugin()]),
			esbuild({
				tsconfig: './tsconfig.rollup.json',
				target: 'esnext',
				define: {
					__VERSION__: JSON.stringify(pkg.version),
					__DEBUG__: JSON.stringify(true),
				},
			}),
		],
	},
]);
