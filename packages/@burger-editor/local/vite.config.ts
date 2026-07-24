import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
	build: {
		target: 'esnext',
		outDir: 'dist',
		lib: {
			entry: {
				client: 'src/client/index.ts',
			},
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
	define: {
		__DEBUG__: true,
		// Reactをバンドルするためprocess.env参照を静的に解決する
		// （vitestではReactを開発モードのまま動かすためtestモードでは定義しない）
		...(mode === 'test' ? {} : { 'process.env.NODE_ENV': JSON.stringify('production') }),
	},
}));
