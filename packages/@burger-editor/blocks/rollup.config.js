import fs from 'node:fs';

import { babel } from '@rollup/plugin-babel';
import { defineConfig } from 'rollup';
import esbuild from 'rollup-plugin-esbuild';
import { string } from 'rollup-plugin-string';

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));

// React Compilerの有効/無効を両方CIで検証するための脱出ハッチ（vitest.config.tsの
// blocks/blocks-editorプロジェクトと同じフラグ。react.devの「両方のモードで
// 実行する」推奨に従う）。通常は常に有効
const noCompiler = process.env.BGE_NO_COMPILER === '1';

export default defineConfig([
	{
		input: './src/index.ts',
		output: {
			file: './dist/index.js',
			format: 'esm',
		},
		plugins: [
			string({ include: ['**/*.html', '**/*.css', '**/*.svg'] }),
			// react-compilerは元のJSX/hook構造を見て解析する必要があるため
			// esbuildによるJSX→createElement変換より前（pluginsの並びは記述順に
			// 実行される）で、かつ型構文をパースできる状態で動かす。
			// @babel/preset-typescriptは型を剥がすだけでJSXはそのまま残す
			...(noCompiler
				? []
				: [
						babel({
							babelHelpers: 'bundled',
							extensions: ['.tsx'],
							exclude: 'node_modules/**',
							presets: ['@babel/preset-typescript'],
							plugins: ['babel-plugin-react-compiler'],
						}),
					]),
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
