import type { CarouselEnvironment, CarouselHandle } from './index.js';
import type { Config } from '@burger-editor/core';

import { items } from '@burger-editor/blocks';
import { Item } from '@burger-editor/core';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import { initImageModal } from '../image-modal/index.js';
import { initBurgerEditorRuntime } from '../init.js';

import { setupCarousels } from './index.js';

// スクロールを伴うテストには公開ページのレイアウトが要る。blocks の style.css を
// まとめたビルド済みの CSS なので、CSS を変えたら `yarn build` してから実行する
import '@burger-editor/css';

const NATIVE: CarouselEnvironment = {
	supportsScrollMarkers: true,
	supportsInvokerCommands: true,
	prefersReducedMotion: false,
};
const POLYFILL: CarouselEnvironment = {
	supportsScrollMarkers: false,
	supportsInvokerCommands: true,
	prefersReducedMotion: false,
};

interface Settings {
	autoplay?: boolean;
	loop?: boolean;
	perView?: number;
	arrows?: boolean;
	dots?: boolean;
	effect?: 'slide' | 'fade';
	slides?: number;
	/** スライドごとのキャプション。既定は `キャプション N` */
	captions?: readonly string[];
	/** スライドごとの画像の alt。既定は `スライド N` */
	alts?: readonly string[];
	/** 画像をポップアップ（画像モーダル）にする */
	popup?: boolean;
}

let handle: CarouselHandle | null = null;

afterEach(() => {
	handle?.destroy();
	handle = null;
	document.body.replaceChildren();
	vi.useRealTimers();
});

const CONFIG: Config = {
	classList: [],
	googleMapsApiKey: null,
	sampleImagePath: '',
	sampleFilePath: '',
	stylesheets: [],
};

/**
 * 本物の carousel アイテム（`@burger-editor/blocks` のテンプレート）を、保存と同じ
 * `toItemData` で埋めて body に置く。保存形が変わると、このテストも追従して落ちる
 * @param settings
 */
async function mount(settings: Settings = {}) {
	const {
		autoplay = false,
		loop = false,
		perView = 1,
		arrows = true,
		dots = true,
		effect = 'slide',
		slides = 5,
		captions = Array.from({ length: slides }, (_, i) => `キャプション ${i + 1}`),
		alts = Array.from({ length: slides }, (_, i) => `スライド ${i + 1}`),
		popup = false,
	} = settings;
	const seed = items.carousel;
	const item = Item.create('carousel', new Map([['carousel', seed]]), CONFIG);
	const base = seed.toEditorState!(item.export() as never, CONFIG) as Record<
		string,
		unknown
	>;
	const state: Record<string, unknown> = { ...base };
	// スライドごとの配列は、テンプレートの 1 枚目の値をスライド数分に揃える
	for (const [key, value] of Object.entries(base)) {
		if (Array.isArray(value)) {
			state[key] = Array.from({ length: slides }, () => value[0]);
		}
	}
	Object.assign(state, {
		autoplay,
		loop,
		perView,
		arrows,
		dots,
		effect,
		caption: [...captions],
		alt: [...alts],
		...(popup
			? {
					node: Array.from({ length: slides }, () => 'button'),
					command: Array.from({ length: slides }, () => 'show-modal'),
				}
			: {}),
	});
	item.import((await seed.toItemData!(state as never, CONFIG)) as never);
	item.el.style.inlineSize = '600px';
	document.body.append(item.el);

	const list = item.el.querySelector<HTMLElement>('[data-bge-list]')!;
	const el = list.parentElement!;
	const slideEls = [...list.querySelectorAll<HTMLElement>(':scope > figure')];
	const button = (name: string) =>
		el.querySelector<HTMLButtonElement>(`[data-bge-carousel-button='${name}']`);
	const markers = () => [
		...el.querySelectorAll<HTMLButtonElement>('[data-bge-carousel-markers] > button'),
	];
	const current = () =>
		markers().findIndex((m) => m.getAttribute('aria-current') === 'true');
	return { el, list, slides: slideEls, button, markers, current };
}

describe('initCarousel', () => {
	describe('役割と名前（名前は作者が書いた内容から付け、aria-label を使わない）', () => {
		test('外枠は名前の無い group、スライドは figure のまま roledescription だけを足す', async () => {
			const { el, slides } = await mount({ slides: 3 });
			handle = setupCarousels({}, NATIVE);

			expect(el.getAttribute('role')).toBe('group');
			expect(el.getAttribute('aria-roledescription')).toBe('carousel');
			expect(slides.map((s) => s.getAttribute('role'))).toEqual([null, null, null]);
			expect(slides.map((s) => s.getAttribute('aria-roledescription'))).toEqual([
				'slide',
				'slide',
				'slide',
			]);
			expect(el.hasAttribute('aria-label')).toBe(false);
			expect(el.querySelector('[aria-label]')).toBeNull();
		});

		test('スライドの名前はキャプションから、キャプションが空なら画像の alt から付く', async () => {
			await mount({ slides: 2, captions: ['春の庭', ''], alts: ['桜', '紅葉'] });
			handle = setupCarousels({}, POLYFILL);

			expect(page.getByRole('figure', { name: '春の庭' }).query()).not.toBeNull();
			expect(page.getByRole('figure', { name: '紅葉' }).query()).not.toBeNull();
		});

		test('スライドは名前の元を aria-labelledby で明示する（Chromium は figcaption から figure の名前を計算しないため）', async () => {
			const { slides } = await mount({
				slides: 2,
				captions: ['春の庭', ''],
				alts: ['桜', '紅葉'],
			});
			handle = setupCarousels({}, NATIVE);

			const [first, second] = slides;
			expect(first!.getAttribute('aria-labelledby')).toBe(
				first!.querySelector('figcaption')!.id,
			);
			expect(second!.getAttribute('aria-labelledby')).toBe(
				second!.querySelector('img')!.id,
			);
		});

		test('ドットの名前は、そのスライドの名前の元（キャプション、空なら alt）から付く', async () => {
			await mount({ slides: 2, captions: ['春の庭', ''], alts: ['桜', '紅葉'] });
			handle = setupCarousels({}, POLYFILL);

			expect(page.getByRole('button', { name: '春の庭' }).query()).not.toBeNull();
			expect(page.getByRole('button', { name: '紅葉' }).query()).not.toBeNull();
		});

		test('runtime が読み直す名前は、保存時に導かれる名前と同じ規則になる（区切りの要素の一覧を両方で持つため）', async () => {
			const captions = [
				'春の<br>庭',
				'<h3>見出し</h3>本文',
				'<ul><li>一つ目</li><li>二つ目</li></ul>',
				'<table><tr><td>左</td><td>右</td></tr></table>',
				'  前後の  空白  ',
			];
			const { slides } = await mount({ slides: captions.length, captions });
			const saved = slides.map((slide) => slide.dataset.bgeSlideLabel);
			handle = setupCarousels({}, POLYFILL);

			expect(slides.map((slide) => slide.dataset.bgeSlideLabel)).toEqual(saved);
			expect(saved).toEqual([
				'春の 庭',
				'見出し 本文',
				'一つ目 二つ目',
				'左 右',
				'前後の 空白',
			]);
		});

		test('保存された data-bge-slide-label が古くても、今のキャプションから読み直して名前にする（エージェント経由の保存は toItemData を通らない）', async () => {
			const { slides, markers } = await mount({ slides: 1, captions: ['新しい名前'] });
			slides[0]!.dataset.bgeSlideLabel = '古い名前';
			handle = setupCarousels({}, POLYFILL);

			expect(slides[0]!.dataset.bgeSlideLabel).toBe('新しい名前');
			expect(markers()[0]!.textContent).toBe('新しい名前');

			handle.destroy();
			handle = null;
			expect(slides[0]!.dataset.bgeSlideLabel).toBe('古い名前');
		});

		test('キャプションも alt も無いスライドのドットは、設定の文字を名前にする', async () => {
			// Behavior change: 名前の無いスライドは toItemData が拒むので、保存形として作れない
			await expect(
				mount({ slides: 2, captions: ['', ''], alts: ['', ''] }),
			).rejects.toThrow('キャプションも代替テキスト(alt)も空');
			// await mount({ slides: 2, captions: ['', ''], alts: ['', ''] }); // previous
			// handle = setupCarousels({ markerLabel: (i) => `Go to ${i}` }, POLYFILL); // previous
			// expect(page.getByRole('button', { name: 'Go to 2' }).query()).not.toBeNull(); // previous
		});

		test('toItemData を通らずに名前が空になった HTML（エージェント経由の保存や、すでに保存されたページ）でも、ドットは設定の文字を名前にする', async () => {
			const { slides } = await mount({ slides: 2 });
			for (const slide of slides) {
				slide.querySelector('figcaption')!.textContent = '';
				slide.querySelector('img')!.setAttribute('alt', '');
				slide.dataset.bgeSlideLabel = '';
			}
			// 前提: 名前の元が本当に空になっている（テンプレートの構造が変わって別の要素を
			// 空にしていても、ここで気づける）
			expect(slides).toHaveLength(2);
			expect(slides.map((s) => s.querySelector('figcaption')?.textContent)).toEqual([
				'',
				'',
			]);
			expect(slides.map((s) => s.querySelector('img')?.getAttribute('alt'))).toEqual([
				'',
				'',
			]);
			handle = setupCarousels({ markerLabel: (i) => `Go to ${i}` }, POLYFILL);

			expect(page.getByRole('button', { name: 'Go to 2' }).query()).not.toBeNull();
		});

		test('ドットはスライド内を参照せず、自身の文字で名前を持つ（フェードで inert のスライドを参照すると Chromium が名前を失うため）', async () => {
			const { markers } = await mount({
				effect: 'fade',
				slides: 2,
				captions: ['春の庭', ''],
				alts: ['桜', '紅葉'],
			});
			handle = setupCarousels({}, POLYFILL);

			expect(markers().map((m) => m.hasAttribute('aria-labelledby'))).toEqual([
				false,
				false,
			]);
			expect(markers().map((m) => m.textContent)).toEqual(['春の庭', '紅葉']);
		});

		test('矢印の名前はボタンの中の文字から付き、文字は設定で差し替えられる', async () => {
			const { list } = await mount();
			handle = setupCarousels({ previousLabel: 'Previous', nextLabel: 'Next' }, POLYFILL);

			const previous = page
				.getByRole('button', { name: 'Previous', exact: true })
				.query();
			const next = page.getByRole('button', { name: 'Next', exact: true }).query();
			expect(previous).not.toBeNull();
			expect(next?.getAttribute('aria-controls')).toBe(list.id);
		});

		test('フェードでは、切り替えで現れたスライドを読み上げる', async () => {
			const { list } = await mount({ effect: 'fade' });
			handle = setupCarousels({}, POLYFILL);

			expect(list.getAttribute('aria-live')).toBe('polite');
		});

		test('フェードの自動再生中は読み上げず、止めると読み上げる', async () => {
			vi.useFakeTimers();
			const { list, button } = await mount({ effect: 'fade', autoplay: true });
			handle = setupCarousels({ interval: 1000 }, POLYFILL);

			expect(list.getAttribute('aria-live')).toBe('off');
			button('play')!.click();
			expect(list.getAttribute('aria-live')).toBe('polite');
		});

		test('スライド効果では読み上げない（全スライドを支援技術に見せているので、知らせる新しい中身が無い）', async () => {
			vi.useFakeTimers();
			const { list, button } = await mount({ autoplay: true });
			handle = setupCarousels({ interval: 1000 }, POLYFILL);

			expect(list.hasAttribute('aria-live')).toBe(false);
			button('play')!.click();
			expect(list.hasAttribute('aria-live')).toBe(false);
		});
	});

	describe('矢印とドット', () => {
		test('標準の疑似要素に対応するブラウザでは、要素を生成せず CSS に任せる', async () => {
			const { el, button, markers } = await mount();
			handle = setupCarousels({}, NATIVE);

			expect(Object.hasOwn(el.dataset, 'bgeCarouselControls')).toBe(false);
			expect(button('previous')).toBeNull();
			expect(button('next')).toBeNull();
			expect(markers()).toHaveLength(0);
		});

		test('対応しないブラウザでは、矢印とスライド数分のドットを button として生成する', async () => {
			const { el, list, button, markers } = await mount();
			handle = setupCarousels({}, POLYFILL);

			expect(Object.hasOwn(el.dataset, 'bgeCarouselControls')).toBe(true);
			expect(button('previous')?.type).toBe('button');
			expect(button('next')?.type).toBe('button');
			expect(markers()).toHaveLength(5);
			// スライドより後ろ（Tab 順でスライドの後）に置く
			expect(list.compareDocumentPosition(button('previous')!)).toBe(
				Node.DOCUMENT_POSITION_FOLLOWING,
			);
		});

		test('ループのときは、標準の疑似要素に対応していても生成する（標準の矢印は端で押せない）', async () => {
			const { el, button } = await mount({ loop: true });
			handle = setupCarousels({}, NATIVE);

			expect(Object.hasOwn(el.dataset, 'bgeCarouselControls')).toBe(true);
			expect(button('next')).not.toBeNull();
		});

		test('フェードのときは、標準の疑似要素に対応していても生成する（スクロールしない）', async () => {
			const { el, markers } = await mount({ effect: 'fade' });
			handle = setupCarousels({}, NATIVE);

			expect(Object.hasOwn(el.dataset, 'bgeCarouselControls')).toBe(true);
			expect(markers()).toHaveLength(5);
		});

		test('矢印・ドットを出さない設定では、それぞれ生成しない', async () => {
			const { el, button, markers } = await mount({ arrows: false, dots: false });
			handle = setupCarousels({}, POLYFILL);

			expect(Object.hasOwn(el.dataset, 'bgeCarouselControls')).toBe(false);
			expect(button('next')).toBeNull();
			expect(markers()).toHaveLength(0);
		});

		test('矢印だけを出す設定では、ドットを生成しない', async () => {
			const { button, markers } = await mount({ dots: false });
			handle = setupCarousels({}, POLYFILL);

			expect(button('next')).not.toBeNull();
			expect(markers()).toHaveLength(0);
		});
	});

	describe('スライドの移動', () => {
		test('次へで 1 枚分スクロールし、現在のドットが進む', async () => {
			const { list, button, current } = await mount();
			handle = setupCarousels({}, POLYFILL);
			expect(current()).toBe(0);

			button('next')!.click();

			expect(current()).toBe(1);
			await vi.waitFor(() => {
				// 幅 600px・余白なし（余白の変数はブロックのコンテナーが定義する）なので 600px ずつ並ぶ
				expect(list.scrollLeft).toBe(600);
			});
		});

		test('ループしないときは、先頭で前へ・末尾で次へを押せない', async () => {
			const { button, markers } = await mount({ slides: 3 });
			handle = setupCarousels({}, POLYFILL);

			expect(button('previous')!.getAttribute('aria-disabled')).toBe('true');
			expect(button('next')!.getAttribute('aria-disabled')).toBe('false');

			markers()[2]!.click();

			expect(button('previous')!.getAttribute('aria-disabled')).toBe('false');
			expect(button('next')!.getAttribute('aria-disabled')).toBe('true');
		});

		test('ループするときは、先頭で前へを押すと末尾へ、末尾で次へを押すと先頭へ戻る', async () => {
			const { button, current } = await mount({ loop: true, slides: 3 });
			handle = setupCarousels({}, POLYFILL);
			expect(button('previous')!.hasAttribute('aria-disabled')).toBe(false);

			button('previous')!.click();
			expect(current()).toBe(2);

			button('next')!.click();
			expect(current()).toBe(0);
		});

		test('表示枚数が 2 以上のときは、矢印で表示枚数分ずつ進み、末尾は最後の 1 画面で止まる', async () => {
			const { button, markers, current } = await mount({ perView: 2, slides: 5 });
			handle = setupCarousels({}, POLYFILL);

			const states = () => markers().map((m) => m.getAttribute('aria-current'));

			// 標準の ::scroll-marker と同じく、表示枚数に関わらず現在の 1 枚だけを示す
			expect(states()).toEqual(['true', null, null, null, null]);
			button('next')!.click();
			expect(states()).toEqual([null, null, 'true', null, null]);
			button('next')!.click();
			// 5 枚・2 枚表示の最後の 1 画面は 4〜5 枚目
			expect(states()).toEqual([null, null, null, 'true', null]);
			expect(current()).toBe(3);
			expect(button('next')!.getAttribute('aria-disabled')).toBe('true');
		});

		test('表示枚数がスライド数より多いときは、全スライドを 1 画面として扱う', async () => {
			const { button } = await mount({ perView: 5, slides: 3 });
			handle = setupCarousels({}, POLYFILL);

			expect(button('previous')!.getAttribute('aria-disabled')).toBe('true');
			expect(button('next')!.getAttribute('aria-disabled')).toBe('true');
		});

		test('端の矢印は押せない状態でもフォーカスを保ち、押しても動かない（disabled にするとキーボード利用者が位置を失う）', async () => {
			const { button, current } = await mount({ slides: 2 });
			handle = setupCarousels({}, POLYFILL);
			const next = button('next')!;

			next.focus();
			next.click();
			expect(current()).toBe(1);
			expect(next.getAttribute('aria-disabled')).toBe('true');
			expect(document.activeElement).toBe(next);

			next.click();
			expect(current()).toBe(1);
		});

		test('表示枚数が 2 以上で末尾の画面に収まるスライドのドットを押すと、押したドットが現在になる', async () => {
			const { markers } = await mount({ perView: 3, slides: 7 });
			handle = setupCarousels({}, POLYFILL);

			markers()[6]!.click();

			expect(markers().map((m) => m.getAttribute('aria-current'))).toEqual([
				null,
				null,
				null,
				null,
				null,
				null,
				'true',
			]);
		});

		test('JS で動かしている途中に同じドットをもう一度押しても、通過するスライドで現在位置が戻らない', async () => {
			const { list, markers, current } = await mount();
			list.style.scrollBehavior = 'smooth';
			handle = setupCarousels({}, POLYFILL);

			markers()[3]!.click();
			markers()[3]!.click();
			// 2 枚目（600px）を通り過ぎるまで待つ
			await vi.waitFor(() => {
				expect(list.scrollLeft).toBeGreaterThan(900);
			});
			expect(current()).toBe(3);
		});

		test('JS で動かしたスクロールが目標に着かなくても、しばらくすると見えている位置に合わせ直す', async () => {
			const { list, markers, current } = await mount();
			handle = setupCarousels({}, POLYFILL);
			// scrollend の無いブラウザを再現する（対象の要素に届く前に止める）
			const blockScrollEnd = (event: Event) => event.stopPropagation();
			document.addEventListener('scrollend', blockScrollEnd, { capture: true });
			try {
				// 表示されていないとスクロールが起きず、目標にも着かない
				list.style.display = 'none';
				markers()[3]!.click();
				expect(current()).toBe(3);

				list.style.display = '';
				list.scrollTo({ left: 1200, behavior: 'instant' });
				await new Promise((resolve) => setTimeout(resolve, 300));
				// 目標（3 枚目）に着いていないので、まだ合わせ直さない
				expect(current()).toBe(3);

				await vi.waitFor(
					() => {
						expect(current()).toBe(2);
					},
					{ timeout: 3000 },
				);
			} finally {
				document.removeEventListener('scrollend', blockScrollEnd, { capture: true });
			}
		});

		test('サイトの CSS で表示枚数（--per-view）と幅が変わると、送る枚数も変わる', async () => {
			const { el, button, current } = await mount({ slides: 6 });
			handle = setupCarousels({}, POLYFILL);
			button('next')!.click();
			expect(current()).toBe(1);

			// メディアクエリーで幅と表示枚数が変わった想定
			el.parentElement!.style.inlineSize = '900px';
			el.style.setProperty('--per-view', '3');
			// ResizeObserver は次の描画の前に通知される
			await new Promise(requestAnimationFrame);
			await new Promise(requestAnimationFrame);

			button('next')!.click();
			expect(current()).toBe(3);
			expect(button('next')!.getAttribute('aria-disabled')).toBe('true');
		});

		test('JS で動かしている途中に通過するスライドで現在位置が戻らない', async () => {
			const { list, button, markers, current } = await mount();
			list.style.scrollBehavior = 'smooth';
			handle = setupCarousels({}, POLYFILL);

			markers()[3]!.click();
			// 2 枚目（600px）を通り過ぎるまで待つ（通過したスライドが observer に報告される）
			await vi.waitFor(() => {
				expect(list.scrollLeft).toBeGreaterThan(900);
			});
			expect(current()).toBe(3);

			button('next')!.click();
			expect(current()).toBe(4);
			await vi.waitFor(() => {
				expect(list.scrollLeft).toBe(2400);
			});
			expect(current()).toBe(4);
		});

		test('手でスクロールしたときも、現在のドットが追従する', async () => {
			const { list, current } = await mount();
			handle = setupCarousels({}, POLYFILL);

			list.scrollTo({ left: 1800, behavior: 'instant' });

			await vi.waitFor(() => {
				expect(current()).toBe(3);
			});
		});

		test('スライド効果では、画面外のスライドに inert を付けない（Tab で移るとブラウザがスクロールする）', async () => {
			const { slides, button } = await mount();
			handle = setupCarousels({}, POLYFILL);

			button('next')!.click();

			expect(slides.some((s) => s.inert)).toBe(false);
		});
	});

	describe('フェード', () => {
		test('表示中のスライドだけに current を付け、ほかは inert にする', async () => {
			const { el, slides, button } = await mount({ effect: 'fade', slides: 3 });
			handle = setupCarousels({}, POLYFILL);
			const state = () =>
				slides.map((s) => [Object.hasOwn(s.dataset, 'bgeCarouselCurrent'), s.inert]);

			expect(Object.hasOwn(el.dataset, 'bgeCarouselFade')).toBe(true);
			expect(state()).toEqual([
				[true, false],
				[false, true],
				[false, true],
			]);

			button('next')!.click();

			expect(state()).toEqual([
				[false, true],
				[true, false],
				[false, true],
			]);
		});

		test('表示枚数の設定に関わらず 1 枚ずつ切り替える', async () => {
			const { slides, button } = await mount({ effect: 'fade', perView: 3, slides: 4 });
			handle = setupCarousels({}, POLYFILL);

			button('next')!.click();

			expect(slides.map((s) => Object.hasOwn(s.dataset, 'bgeCarouselCurrent'))).toEqual([
				false,
				true,
				false,
				false,
			]);
		});

		test('重ねて表示する（スクロールしない）', async () => {
			const { list, slides } = await mount({ effect: 'fade' });
			handle = setupCarousels({}, POLYFILL);

			expect(list.scrollWidth).toBe(list.clientWidth);
			expect(slides[1]!.offsetLeft).toBe(slides[0]!.offsetLeft);
		});
	});

	describe('自動再生', () => {
		test('再生・停止ボタンを Tab 順の先頭（スライドより前）に置き、間隔ごとに次へ進む', async () => {
			vi.useFakeTimers();
			const { el, list, button, current } = await mount({ autoplay: true });
			handle = setupCarousels({ interval: 1000 }, POLYFILL);

			const play = button('play')!;
			expect(play.compareDocumentPosition(list)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
			expect(el.querySelector('button')).toBe(play);
			expect(play.querySelector('[data-bge-carousel-text]')?.textContent).toBe(
				'自動再生を停止',
			);

			vi.advanceTimersByTime(1000);
			expect(current()).toBe(1);
		});

		test('末尾ではループの設定に関わらず先頭に戻る', async () => {
			vi.useFakeTimers();
			const { current } = await mount({ autoplay: true, loop: false, slides: 2 });
			handle = setupCarousels({ interval: 1000 }, POLYFILL);

			vi.advanceTimersByTime(1000);
			expect(current()).toBe(1);
			vi.advanceTimersByTime(1000);
			expect(current()).toBe(0);
		});

		test('停止ボタンで止まり、再生ボタンで再開する', async () => {
			vi.useFakeTimers();
			const { button, current } = await mount({ autoplay: true });
			handle = setupCarousels({ interval: 1000 }, POLYFILL);
			const play = button('play')!;

			play.click();
			expect(play.querySelector('[data-bge-carousel-text]')?.textContent).toBe(
				'自動再生を開始',
			);
			vi.advanceTimersByTime(3000);
			expect(current()).toBe(0);

			play.click();
			expect(play.querySelector('[data-bge-carousel-text]')?.textContent).toBe(
				'自動再生を停止',
			);
			vi.advanceTimersByTime(1000);
			expect(current()).toBe(1);
		});

		test('ポインターが載っている間は止まる', async () => {
			vi.useFakeTimers();
			const { el, current } = await mount({ autoplay: true });
			handle = setupCarousels({ interval: 1000 }, POLYFILL);

			el.dispatchEvent(new PointerEvent('pointerenter'));
			vi.advanceTimersByTime(3000);
			expect(current()).toBe(0);

			el.dispatchEvent(new PointerEvent('pointerleave'));
			vi.advanceTimersByTime(1000);
			expect(current()).toBe(1);
		});

		test('キーボードでフォーカスが入っている間は止まり、外へ出ると再開する', async () => {
			const { el, button, current } = await mount({ autoplay: true });
			handle = setupCarousels({ interval: 200 }, POLYFILL);
			const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
			// 表示した位置にマウスポインターがあると、スクロールなどのたびに pointerenter が
			// 来てホバーで止まる。実際のポインターを外の要素へ動かし、止まる理由をフォーカスだけにする
			const outside = document.createElement('div');
			outside.style.blockSize = '50px';
			document.body.append(outside);
			await userEvent.hover(outside);

			// 実際のキーボード操作で入る（:focus-visible は直前の操作がマウスかで変わる）
			await userEvent.keyboard('{Tab}');
			expect(document.activeElement).toBe(button('play'));
			await wait(600);
			expect(current()).toBe(0);

			// 中での移動（スライドの入れ物へ）では再開しない
			await userEvent.keyboard('{Tab}');
			expect(el.contains(document.activeElement)).toBe(true);
			await wait(600);
			expect(current()).toBe(0);

			(document.activeElement as HTMLElement).blur();
			await vi.waitFor(() => {
				expect(current()).toBeGreaterThan(0);
			});
		});

		test('マウスで停止・再生ボタンを押したときは、ボタンにフォーカスが残っていても再開する', async () => {
			const { el, button, current } = await mount({ autoplay: true });
			handle = setupCarousels({ interval: 200 }, POLYFILL);
			const play = button('play')!;

			await userEvent.click(play);
			expect(play.querySelector('[data-bge-carousel-text]')?.textContent).toBe(
				'自動再生を開始',
			);
			await userEvent.click(play);
			expect(play.querySelector('[data-bge-carousel-text]')?.textContent).toBe(
				'自動再生を停止',
			);
			expect(document.activeElement).toBe(play);
			// ポインターが載ったままだと止まるので、外へ出す
			el.dispatchEvent(new PointerEvent('pointerleave'));

			await vi.waitFor(() => {
				expect(current()).toBeGreaterThan(0);
			});
		});

		test.each(['slide', 'fade'] as const)(
			'画像モーダルを開いている間は進まず、閉じると再開する（%s）',
			async (effect) => {
				const { el, slides, current } = await mount({
					autoplay: true,
					effect,
					popup: true,
				});
				initImageModal();
				handle = setupCarousels({ interval: 200 }, POLYFILL);
				const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

				await userEvent.click(slides[0]!.querySelector('button')!);
				const dialog = slides[0]!.querySelector('dialog')!;
				expect(dialog.open).toBe(true);
				// タッチで開いた想定。指を離すとポインターが外れ、フォーカスもキーボード扱い
				// にならないので、止める条件はダイアログが開いていることだけになる
				el.dispatchEvent(new PointerEvent('pointerleave'));
				await wait(600);
				expect(current()).toBe(0);
				expect(slides[0]!.inert).toBe(false);

				dialog.close();
				await vi.waitFor(() => {
					expect(current()).toBeGreaterThan(0);
				});
			},
		);

		test('停止ボタンで止めたあとは、ポインターが離れても再開しない', async () => {
			vi.useFakeTimers();
			const { el, button, current } = await mount({ autoplay: true });
			handle = setupCarousels({ interval: 1000 }, POLYFILL);

			button('play')!.click();
			el.dispatchEvent(new PointerEvent('pointerenter'));
			el.dispatchEvent(new PointerEvent('pointerleave'));
			vi.advanceTimersByTime(3000);
			expect(current()).toBe(0);
		});

		test('動きを減らす設定のときは、止まった状態で始まる', async () => {
			vi.useFakeTimers();
			const { button, current } = await mount({ autoplay: true });
			handle = setupCarousels(
				{ interval: 1000 },
				{ ...POLYFILL, prefersReducedMotion: true },
			);

			expect(button('play')!.querySelector('[data-bge-carousel-text]')?.textContent).toBe(
				'自動再生を開始',
			);
			vi.advanceTimersByTime(3000);
			expect(current()).toBe(0);
		});

		test('標準の疑似要素に対応するブラウザでも、再生・停止ボタンは生成する', async () => {
			const { el, button } = await mount({ autoplay: true });
			handle = setupCarousels({}, NATIVE);

			expect(button('play')).not.toBeNull();
			expect(Object.hasOwn(el.dataset, 'bgeCarouselControls')).toBe(false);
		});

		test('自動再生しない設定では、再生・停止ボタンを生成しない', async () => {
			const { button } = await mount({ autoplay: false });
			handle = setupCarousels({}, POLYFILL);

			expect(button('play')).toBeNull();
		});

		test('スライドが表示枚数以下なら送る先が無いので、自動再生も再生・停止ボタンも出さない', async () => {
			const { button } = await mount({ autoplay: true, perView: 3, slides: 3 });
			handle = setupCarousels({}, POLYFILL);

			expect(button('play')).toBeNull();
		});

		test.each([0, -1, Number.NaN])(
			'自動再生の間隔に %s を渡すと、既定値（5000ms）を使う',
			async (interval) => {
				vi.useFakeTimers();
				const { current } = await mount({ autoplay: true });
				handle = setupCarousels({ interval }, POLYFILL);

				vi.advanceTimersByTime(4999);
				expect(current()).toBe(0);
				vi.advanceTimersByTime(1);
				expect(current()).toBe(1);
			},
		);
	});

	test('destroy でタイマーを止め、生成した要素と付けた属性を元に戻す', async () => {
		vi.useFakeTimers();
		const { el } = await mount({ autoplay: true, effect: 'fade' });
		const before = document.body.innerHTML;
		const instance = setupCarousels({ interval: 1000 }, POLYFILL);

		instance.destroy();
		vi.advanceTimersByTime(3000);

		expect(document.body.innerHTML).toBe(before);
		expect(el.querySelector('[data-bge-carousel-current]')).toBeNull();
	});

	test('Symbol.dispose が使える環境では、destroy と同じ後始末を Symbol.dispose でも呼べる', async () => {
		await mount({ effect: 'fade' });
		const before = document.body.innerHTML;
		const instance = setupCarousels({}, POLYFILL) as CarouselHandle & Disposable;

		instance[Symbol.dispose]();

		expect(document.body.innerHTML).toBe(before);
	});

	test('root を指定すると、その中の carousel だけを初期化する', async () => {
		const { el } = await mount();
		const outside = document.createElement('div');
		document.body.append(outside);
		handle = setupCarousels({ root: outside }, POLYFILL);

		expect(el.hasAttribute('role')).toBe(false);
	});

	test('初期化済みのカルーセルは二重に初期化しない（ボタンとリスナーが重複し、1 回の操作で 2 つ進む）', async () => {
		const { el, button, current } = await mount();
		handle = setupCarousels({}, POLYFILL);
		const second = setupCarousels({}, POLYFILL);

		expect(el.querySelectorAll("[data-bge-carousel-button='next']")).toHaveLength(1);
		button('next')!.click();
		expect(current()).toBe(1);

		second.destroy();
		expect(button('next')).not.toBeNull();
	});

	test('destroy で、初期化前から inert だったスライドは inert のまま戻す', async () => {
		const { slides } = await mount({ effect: 'fade', slides: 3 });
		slides[2]!.inert = true;
		const instance = setupCarousels({}, POLYFILL);

		instance.destroy();

		expect(slides.map((s) => s.inert)).toEqual([false, false, true]);
	});

	test('Invoker Commands に対応していないブラウザでは、フェードにせず CSS だけの横スクロールで全スライドに届く', async () => {
		const { el, slides } = await mount({ effect: 'fade', slides: 3 });
		handle = setupCarousels({}, { ...POLYFILL, supportsInvokerCommands: false });

		expect(Object.hasOwn(el.dataset, 'bgeCarouselFade')).toBe(false);
		expect(slides.map((s) => s.inert)).toEqual([false, false, false]);
	});

	test('Invoker Commands に対応していないブラウザでは、動かないボタンも止められない自動再生も出さない', async () => {
		vi.useFakeTimers();
		const { el, button, markers, current } = await mount({ autoplay: true, loop: true });
		handle = setupCarousels(
			{ interval: 1000 },
			{ ...POLYFILL, supportsInvokerCommands: false },
		);

		expect(Object.hasOwn(el.dataset, 'bgeCarouselControls')).toBe(false);
		expect(button('play')).toBeNull();
		expect(button('next')).toBeNull();
		expect(markers()).toHaveLength(0);
		vi.advanceTimersByTime(3000);
		expect(current()).toBe(-1);
	});
});

describe('initBurgerEditorRuntime', () => {
	test('既定で carousel を初期化する', async () => {
		const { el } = await mount();
		initBurgerEditorRuntime({ imageModal: false });

		expect(el.getAttribute('aria-roledescription')).toBe('carousel');
	});

	test('carousel: false で初期化しない', async () => {
		const { el } = await mount();
		initBurgerEditorRuntime({ imageModal: false, carousel: false });

		expect(el.hasAttribute('aria-roledescription')).toBe(false);
	});
});
