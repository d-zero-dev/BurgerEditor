import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
	stories: ['../src/stories/**/*.stories.@(ts|tsx)'],
	framework: {
		name: '@storybook/react-vite',
		options: {},
	},
	async viteFinal(viteConfig) {
		return {
			...viteConfig,
			build: {
				...viteConfig.build,
				// デフォルトでは小さい画像アセットがdata URIにインライン化され、
				// Thumbnail/Previewの拡張子判定（src.split('.').pop()）が
				// 壊れる（"svg+xml,...`のような無意味な文字列になる）ため無効化する
				assetsInlineLimit: 0,
			},
		};
	},
};

export default config;
