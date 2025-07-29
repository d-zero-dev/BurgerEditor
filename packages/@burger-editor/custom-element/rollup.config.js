import { defineConfig } from 'rollup';
import { dts } from 'rollup-plugin-dts';
import esbuild from 'rollup-plugin-esbuild';
import { string } from 'rollup-plugin-string';

export default defineConfig([
	{
		input: './src/index.ts',
		output: {
			file: './dist/index.js',
			format: 'esm',
		},
		plugins: [
			string({ include: ['**/*.svg'] }),
			esbuild({
				tsconfig: './tsconfig.rollup.json',
			}),
		],
	},
	{
		input: './src/index.ts',
		output: {
			file: './dist/index.d.ts',
			format: 'esm',
		},
		plugins: [
			dts({
				tsconfig: './tsconfig.rollup.json',
			}),
		],
	},
]);
