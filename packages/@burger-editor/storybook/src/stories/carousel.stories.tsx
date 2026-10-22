import type { Config } from '@burger-editor/core';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { items } from '@burger-editor/blocks';
import { render } from '@burger-editor/core';
import { initCarousel } from '@burger-editor/runtime';
import { useEffect, useRef } from 'react';

import placeholderImage from '../assets/placeholder-image.svg?url';

import '@burger-editor/css';

interface CarouselArgs {
	readonly autoplay: boolean;
	readonly loop: boolean;
	readonly perView: number;
	readonly arrows: boolean;
	readonly dots: boolean;
	readonly effect: 'slide' | 'fade';
	readonly slides: number;
	/**
	 * `@burger-editor/runtime` を動かすか。`false` は CSS だけで表示した状態
	 */
	readonly runtime: boolean;
	readonly interval: number;
	/**
	 * 画像を包む要素（image アイテムの「リンク」「ポップアップ」と同じ）
	 */
	readonly node: 'div' | 'a' | 'button';
	/**
	 * キャプションを入れるか
	 */
	readonly caption: boolean;
	/**
	 * 画像の alt を入れるか
	 */
	readonly alt: boolean;
}

const CONFIG: Config = {
	classList: [],
	googleMapsApiKey: null,
	sampleImagePath: '',
	sampleFilePath: '',
	stylesheets: [],
};

/**
 * 保存済みの carousel を、公開ページと同じく `@burger-editor/css` と
 * `@burger-editor/runtime` だけで表示する。`render()` はアイテムの `toItemData` を
 * 通らないので、先に保存と同じ `toItemData` で保存形（足りない値の補完、全配列の
 * 長さの揃え、`slideLabel` の導出）にしてから渡す
 * @param args
 */
function PublishedCarousel(args: CarouselArgs) {
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const container = ref.current;
		if (!container) {
			return;
		}
		let disposed = false;
		let destroy = () => {};
		const slides = Array.from({ length: args.slides }, (_, i) => i);
		const seed = items.carousel;
		const state = {
			autoplay: args.autoplay,
			loop: args.loop,
			perView: args.perView,
			arrows: args.arrows,
			dots: args.dots,
			effect: args.effect,
			path: slides.map(() => placeholderImage),
			alt: slides.map((i) => (args.alt ? `スライド ${i + 1}` : '')),
			width: slides.map(() => 320),
			height: slides.map(() => 240),
			caption: slides.map((i) => (args.caption ? `キャプション ${i + 1}` : '')),
			node: slides.map(() => args.node),
			href: slides.map(() => (args.node === 'a' ? 'https://example.com/' : '')),
			command: slides.map(() => (args.node === 'button' ? 'show-modal' : null)),
		};
		void Promise.resolve(seed.toItemData!(state as never, CONFIG))
			.then((data) =>
				render(
					{
						name: 'carousel',
						containerProps: { type: 'grid' },
						items: [[{ name: 'carousel', data }]],
					},
					{ items },
				),
			)
			.then((block) => {
				if (disposed) {
					return;
				}
				container.replaceChildren(block);
				if (args.runtime) {
					destroy = initCarousel({ root: container, interval: args.interval }).destroy;
				}
			});
		return () => {
			disposed = true;
			destroy();
			container.replaceChildren();
		};
	}, [
		args.autoplay,
		args.loop,
		args.perView,
		args.arrows,
		args.dots,
		args.effect,
		args.slides,
		args.runtime,
		args.interval,
		args.node,
		args.caption,
		args.alt,
	]);

	return <div ref={ref} />;
}

const meta = {
	title: 'Public/Carousel',
	component: PublishedCarousel,
	parameters: {
		wrapper: 'none',
	},
	args: {
		autoplay: false,
		loop: false,
		perView: 1,
		arrows: true,
		dots: true,
		effect: 'slide',
		slides: 5,
		runtime: true,
		interval: 3000,
		node: 'div',
		caption: true,
		alt: true,
	},
	argTypes: {
		node: {
			control: 'inline-radio',
			options: ['div', 'a', 'button'],
		},
		effect: {
			control: 'inline-radio',
			options: ['slide', 'fade'],
		},
		perView: {
			control: { type: 'number', min: 1 },
		},
		slides: {
			control: { type: 'number', min: 1 },
		},
	},
} satisfies Meta<typeof PublishedCarousel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CssOnly: Story = {
	args: {
		runtime: false,
	},
};

export const Loop: Story = {
	args: {
		loop: true,
	},
};

export const Autoplay: Story = {
	args: {
		autoplay: true,
	},
};

export const Fade: Story = {
	args: {
		effect: 'fade',
	},
};

export const ThreePerView: Story = {
	args: {
		perView: 3,
		slides: 7,
	},
};
