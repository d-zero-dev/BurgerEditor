import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
	build: {
		target: 'esnext',
		outDir: 'dist',
		lib: {
			entry: 'src/index.ts',
			name: 'BurgerEditorRuntime',
			formats: ['es'],
			fileName: 'runtime',
		},
		sourcemap: true,
		minify: 'esbuild',
	},
	plugins: [
		dts({
			outDir: 'dist',
			entryRoot: 'src',
			tsconfigPath: 'tsconfig.build.json',
		}),
	],
});
