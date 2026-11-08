import type { Config } from '@burger-editor/core';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { items } from '@burger-editor/blocks';
import { render } from '@burger-editor/core';
import { initCarousel } from '@burger-editor/runtime';
import { useEffect, useRef, useState } from 'react';

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
	/**
	 * プロジェクトの CSS の例（`--bge-carousel-*` の変数など）。そのまま `<style>` に入れる
	 */
	readonly styles: string;
}

/**
 * 矢印とドットの変数を一通り上書きした例（`@burger-editor/css` の `docs/carousel.md`）
 */
const THEMED_STYLES = `
[data-bgi='carousel'] {
	--bge-carousel-button-color: #fff;
	--bge-carousel-button-background: #345;
	--bge-carousel-button-border: none;
	--bge-carousel-button-radius: 0.5rem;
	--bge-carousel-previous-icon: '←';
	--bge-carousel-next-icon: '→';
	--bge-carousel-marker-size: 1rem;
	--bge-carousel-marker-border-width: 2px;
	--bge-carousel-marker-border-color: #345;
	--bge-carousel-marker-current-background: #e55;
	--bge-carousel-marker-gap: 1rem;
}
`;

/**
 * 狭い画面で表示枚数を 1 枚に絞る例。ブラウザ幅を 767px 以下にして確かめる
 */
const MAX_PER_VIEW_STYLES = `
@media (max-width: 767px) {
	[data-bgi='carousel'] {
		--bge-carousel-max-per-view: 1;
	}
}
`;

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
 * 長さの揃え、`slideLabel` の導出）にしてから渡す。
 *
 * `toItemData` は名前の無いスライド（キャプションも `alt` も無い）と、リンク・ポップアップで
 * `alt` が空のスライドを拒む。編集画面が確定させない組み合わせなので、その組み合わせ
 * （Controls で `alt` を外して、リンク・ボタンにしたとき、またはキャプションも外したとき）は
 * カルーセルの代わりに、拒んだ理由を表示する
 * @param args
 */
function PublishedCarousel(args: CarouselArgs) {
	const ref = useRef<HTMLDivElement>(null);
	const [error, setError] = useState<string | null>(null);

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
			// 画像の値は、スライドごとに画像ごとの配列（image アイテムと同じ並び）
			path: slides.map(() => [placeholderImage]),
			alt: slides.map((i) => [args.alt ? `スライド ${i + 1}` : '']),
			width: slides.map(() => [320]),
			height: slides.map(() => [240]),
			caption: slides.map((i) => (args.caption ? `キャプション ${i + 1}` : '')),
			node: slides.map(() => args.node),
			href: slides.map(() => (args.node === 'a' ? 'https://example.com/' : '')),
			command: slides.map(() => (args.node === 'button' ? 'show-modal' : null)),
		};
		// `toItemData` は同期的に throw することがあるので、then の中で呼んで拒否に揃える。
		// 受けるのは `toItemData` の拒否だけにして、描画や runtime の本物の不具合を
		// 「拒まれた入力」として表示しない（then の第 2 引数は、同じ then の第 1 引数の失敗を受けない）
		void Promise.resolve()
			.then(() => seed.toItemData!(state as never, CONFIG))
			.then(
				(data) =>
					render(
						{
							name: 'carousel',
							containerProps: { type: 'grid' },
							items: [[{ name: 'carousel', data }]],
						},
						{ items },
					).then((block) => {
						if (disposed) {
							return;
						}
						setError(null);
						container.replaceChildren(block);
						if (args.runtime) {
							destroy = initCarousel({
								root: container,
								interval: args.interval,
							}).destroy;
						}
					}),
				(error_: unknown) => {
					if (disposed) {
						return;
					}
					container.replaceChildren();
					setError(error_ instanceof Error ? error_.message : String(error_));
				},
			);
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

	return (
		<>
			{args.styles ? <style>{args.styles}</style> : null}
			{error ? <p role="alert">{error}</p> : null}
			<div ref={ref} />
		</>
	);
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
		styles: '',
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

/**
 * プロジェクトの CSS で `--bge-carousel-*` の変数を書いたとき。CSS だけの矢印・ドット
 * （`CssOnly`）と、runtime が生成する矢印・ドット（`Loop`）に、同じ見た目が適用される
 */
export const Themed: Story = {
	args: {
		loop: true,
		styles: THEMED_STYLES,
	},
};

export const ThemedCssOnly: Story = {
	args: {
		runtime: false,
		styles: THEMED_STYLES,
	},
};

/**
 * 狭い画面では表示枚数の上限が 1 枚になる
 */
export const MaxPerViewOnNarrowScreen: Story = {
	args: {
		perView: 3,
		slides: 7,
		styles: MAX_PER_VIEW_STYLES,
	},
};
