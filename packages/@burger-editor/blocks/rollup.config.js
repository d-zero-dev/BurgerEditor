import fs from 'node:fs';

import { defineConfig } from 'rollup';
import esbuild from 'rollup-plugin-esbuild';
import { string } from 'rollup-plugin-string';

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));

export default defineConfig([
	{
		input: './src/index.ts',
		output: {
			file: './dist/index.js',
			format: 'esm',
		},
		plugins: [
			string({ include: ['**/*.html', '**/*.css', '**/*.svg'] }),
			esbuild({
				tsconfig: './tsconfig.rollup.json',
				define: {
					__VERSION__: JSON.stringify(pkg.version),
				},
			}),
		],
	},
]);
