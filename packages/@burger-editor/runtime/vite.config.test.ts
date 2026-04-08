import { defineConfig } from 'vite';

export default defineConfig({
	root: '.',
	server: {
		port: 3000,
		open: '/test/index.html',
	},
	resolve: {
		alias: {
			'@burger-editor/runtime': '/src/index.ts',
		},
	},
});
