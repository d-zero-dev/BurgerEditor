import fs from 'node:fs';

import { svelte } from '@sveltejs/vite-plugin-svelte';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
// eslint-disable-next-line import-x/default
import dts from 'vite-plugin-dts';

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));

export default defineConfig({
	build: {
		target: 'esnext',
		outDir: 'dist',
		lib: {
			entry: 'src/index.ts',
			name: 'BgE',
			formats: ['es'],
		},
		sourcemap: true,
		minify: false,
	},
	esbuild: {
		supported: {
			'top-level-await': true,
		},
	},
	plugins: [
		svelte(),
		react(),
		dts({
			outDir: 'dist',
			entryRoot: 'src',
			tsconfigPath: 'tsconfig.build.json',
		}),
	],
	define: {
		__VERSION__: JSON.stringify(pkg.version),
	},
});
