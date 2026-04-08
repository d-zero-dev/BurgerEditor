import { defineConfig } from 'rollup';
import { dts } from 'rollup-plugin-dts';
import esbuild from 'rollup-plugin-esbuild';
import { string } from 'rollup-plugin-string';

const plugins = {
	main: [esbuild(), string({ include: ['**/*.html'] })],
	types: [dts(), string({ include: ['**/*.html'] })],
};

export default defineConfig([
	{
		input: './src/v3/index.ts',
		output: {
			file: './dist/v3/index.js',
			format: 'esm',
		},
		plugins: plugins.main,
	},
	{
		input: './src/v3/index.ts',
		output: {
			file: './dist/v3/index.d.ts',
			format: 'esm',
		},
		plugins: plugins.types,
	},
]);
