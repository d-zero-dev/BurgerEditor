import { defineConfig } from 'vite';

export default defineConfig({
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
	},
});
