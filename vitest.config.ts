import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'jsdom',
		environmentOptions: {
			jsdom: {
				url: 'https://www.d-zero.co.jp',
			},
		},
	},
});
