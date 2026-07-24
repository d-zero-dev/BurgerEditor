import fs from 'node:fs';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
// eslint-disable-next-line import-x/default
import dts from 'vite-plugin-dts';

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));

export default defineConfig(({ mode }) => ({
	build: {
		target: 'esnext',
		outDir: 'dist',
		lib: {
			entry: {
				client: 'src/index.tsx',
				ui: 'src/ui.ts',
			},
			name: 'BgE',
			formats: ['es'],
			cssFileName: 'client',
		},
		sourcemap: true,
		minify: false,
		rollupOptions: {
			// Reactは同梱しない（peer依存）。同梱すると、blocks等の外部参照の
			// Reactと二重になり、フックのdispatcher不一致で実行時に壊れる
			external: [/^react($|\/)/, /^react-dom($|\/)/],
		},
	},
	esbuild: {
		supported: {
			'top-level-await': true,
		},
	},
	plugins: [
		react(),
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
