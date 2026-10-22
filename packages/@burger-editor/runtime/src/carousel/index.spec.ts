import type { CarouselEnvironment, CarouselHandle } from './index.js';

import { afterEach, describe, expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import { initBurgerEditorRuntime } from '../init.js';

import { setupCarousels } from './index.js';

import '@burger-editor/css';

const NATIVE: CarouselEnvironment = {
	supportsScrollMarkers: true,
	prefersReducedMotion: false,
};
const POLYFILL: CarouselEnvironment = {
	supportsScrollMarkers: false,
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
}

let handle: CarouselHandle | null = null;

afterEach(() => {
	handle?.destroy();
	handle = null;
	document.body.replaceChildren();
	vi.useRealTimers();
});

/**
 * carousel アイテムの保存形（`template.html` を `toItemData` で埋めたもの）と同じ構造の HTML
 * @param settings
 */
function mount(settings: Settings = {}) {
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
	} = settings;
	const figures = Array.from(
		{ length: slides },
		(_, i) => `
			<figure data-bge=":style, :scale, :scale-type, :aspect-ratio, :slide-label" data-bge-slide-label="${captions[i] || alts[i] || ''}" style="--css-width: 100cqi">
				<div data-bge=":node, :href, :target, :command">
					<picture>
						<img alt="${alts[i] ?? ''}" width="400" height="300" />
					</picture>
				</div>
				<figcaption data-bge="caption">${captions[i] ?? ''}</figcaption>
			</figure>`,
	).join('');
	document.body.innerHTML = `
		<div data-bgi="carousel" style="inline-size: 600px">
			<div data-bge=":autoplay, :loop, :per-view, :arrows, :dots, :effect, layout-style:style" data-bge-autoplay="${autoplay}" data-bge-loop="${loop}" data-bge-per-view="${perView}" data-bge-arrows="${arrows}" data-bge-dots="${dots}" data-bge-effect="${effect}" style="--per-view: ${perView}">
				<div data-bge-list tabindex="0">${figures}</div>
			</div>
		</div>`;
	const el = document.querySelector<HTMLElement>('[data-bge-per-view]')!;
	const list = el.querySelector<HTMLElement>('[data-bge-list]')!;
	const slideEls = [...list.querySelectorAll<HTMLElement>('figure')];
	const button = (name: string) =>
		el.querySelector<HTMLButtonElement>(`[data-bge-carousel-button='${name}']`);
	const markers = () => [
		...el.querySelectorAll<HTMLButtonElement>('[data-bge-carousel-markers] > button'),
	];
	const current = () =>
		markers().findIndex((m) => m.getAttribute('aria-current') === 'true');
	return { el, list, slides: slideEls, button, markers, current };
}

describe('@burger-editor/css のレイアウト', () => {
	test.each([
		['未指定', ''],
		['単位なしの 0', '--bge-options-column-gap: 0'],
		['1rem', '--bge-options-column-gap: 1rem'],
	])('スライド間の余白が %s でも、表示枚数どおりの幅で横に並ぶ', (_, gap) => {
		const { el, list, slides } = mount({ perView: 2, slides: 4 });
		el.parentElement!.setAttribute('style', `inline-size: 600px; ${gap}`);

		const columnGap = Number.parseFloat(getComputedStyle(list).columnGap) || 0;
		const expected = (list.clientWidth - columnGap) / 2;
		expect(slides[0]!.getBoundingClientRect().width).toBeCloseTo(expected, 0);
		expect(list.scrollWidth).toBeGreaterThan(list.clientWidth);
	});
});

describe('initCarousel', () => {
	describe('役割と名前（名前は作者が書いた内容から付け、aria-label を使わない）', () => {
		test('外枠は名前の無い group、スライドは figure のまま roledescription だけを足す', () => {
			const { el, slides } = mount({ slides: 3 });
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

		test('スライドの名前はキャプションから、キャプションが空なら画像の alt から付く', () => {
			mount({ slides: 2, captions: ['春の庭', ''], alts: ['桜', '紅葉'] });
			handle = setupCarousels({}, POLYFILL);

			expect(page.getByRole('figure', { name: '春の庭' }).query()).not.toBeNull();
			expect(page.getByRole('figure', { name: '紅葉' }).query()).not.toBeNull();
		});

		test('スライドは名前の元を aria-labelledby で明示する（Chromium は figcaption から figure の名前を計算せず、標準のドットが名前を失うため）', () => {
			const { slides } = mount({
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

		test('ドットの名前は、そのスライドの名前の元（キャプション、空なら alt）から付く', () => {
			mount({ slides: 2, captions: ['春の庭', ''], alts: ['桜', '紅葉'] });
			handle = setupCarousels({}, POLYFILL);

			expect(page.getByRole('button', { name: '春の庭' }).query()).not.toBeNull();
			expect(page.getByRole('button', { name: '紅葉' }).query()).not.toBeNull();
		});

		test('キャプションも alt も無いスライドのドットは、設定の文字を名前にする', () => {
			mount({ slides: 2, captions: ['', ''], alts: ['', ''] });
			handle = setupCarousels({ markerLabel: (i) => `Go to ${i}` }, POLYFILL);

			expect(page.getByRole('button', { name: 'Go to 2' }).query()).not.toBeNull();
		});

		test('ドットはスライド内を参照せず、自身の文字で名前を持つ（フェードで inert のスライドを参照すると Chromium が名前を失うため）', () => {
			const { markers } = mount({
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

		test('矢印の名前はボタンの中の文字から付き、文字は設定で差し替えられる', () => {
			const { list } = mount();
			handle = setupCarousels({ previousLabel: 'Previous', nextLabel: 'Next' }, POLYFILL);

			const previous = page
				.getByRole('button', { name: 'Previous', exact: true })
				.query();
			const next = page.getByRole('button', { name: 'Next', exact: true }).query();
			expect(previous).not.toBeNull();
			expect(next?.getAttribute('aria-controls')).toBe(list.id);
		});

		test('フェードでは、切り替えで現れたスライドを読み上げる', () => {
			const { list } = mount({ effect: 'fade' });
			handle = setupCarousels({}, POLYFILL);

			expect(list.getAttribute('aria-live')).toBe('polite');
		});

		test('フェードの自動再生中は読み上げず、止めると読み上げる', () => {
			vi.useFakeTimers();
			const { list, button } = mount({ effect: 'fade', autoplay: true });
			handle = setupCarousels({ interval: 1000 }, POLYFILL);

			expect(list.getAttribute('aria-live')).toBe('off');
			button('play')!.click();
			expect(list.getAttribute('aria-live')).toBe('polite');
		});

		test('スライド効果では読み上げない（全スライドを支援技術に見せているので、知らせる新しい中身が無い）', () => {
			vi.useFakeTimers();
			const { list, button } = mount({ autoplay: true });
			handle = setupCarousels({ interval: 1000 }, POLYFILL);

			expect(list.hasAttribute('aria-live')).toBe(false);
			button('play')!.click();
			expect(list.hasAttribute('aria-live')).toBe(false);
		});
	});

	describe('矢印とドット', () => {
		test('標準の疑似要素に対応するブラウザでは、要素を生成せず CSS に任せる', () => {
			const { el, button, markers } = mount();
			handle = setupCarousels({}, NATIVE);

			expect(Object.hasOwn(el.dataset, 'bgeCarouselControls')).toBe(false);
			expect(button('previous')).toBeNull();
			expect(button('next')).toBeNull();
			expect(markers()).toHaveLength(0);
		});

		test('対応しないブラウザでは、矢印とスライド数分のドットを button として生成する', () => {
			const { el, list, button, markers } = mount();
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

		test('ループのときは、標準の疑似要素に対応していても生成する（標準の矢印は端で押せない）', () => {
			const { el, button } = mount({ loop: true });
			handle = setupCarousels({}, NATIVE);

			expect(Object.hasOwn(el.dataset, 'bgeCarouselControls')).toBe(true);
			expect(button('next')).not.toBeNull();
		});

		test('フェードのときは、標準の疑似要素に対応していても生成する（スクロールしない）', () => {
			const { el, markers } = mount({ effect: 'fade' });
			handle = setupCarousels({}, NATIVE);

			expect(Object.hasOwn(el.dataset, 'bgeCarouselControls')).toBe(true);
			expect(markers()).toHaveLength(5);
		});

		test('矢印・ドットを出さない設定では、それぞれ生成しない', () => {
			const { el, button, markers } = mount({ arrows: false, dots: false });
			handle = setupCarousels({}, POLYFILL);

			expect(Object.hasOwn(el.dataset, 'bgeCarouselControls')).toBe(false);
			expect(button('next')).toBeNull();
			expect(markers()).toHaveLength(0);
		});

		test('矢印だけを出す設定では、ドットを生成しない', () => {
			const { button, markers } = mount({ dots: false });
			handle = setupCarousels({}, POLYFILL);

			expect(button('next')).not.toBeNull();
			expect(markers()).toHaveLength(0);
		});
	});

	describe('スライドの移動', () => {
		test('次へで 1 枚分スクロールし、現在のドットが進む', async () => {
			const { list, slides, button, current } = mount();
			handle = setupCarousels({}, POLYFILL);
			expect(current()).toBe(0);

			button('next')!.click();

			expect(current()).toBe(1);
			await vi.waitFor(() => {
				expect(list.scrollLeft).toBe(slides[1]!.offsetLeft - slides[0]!.offsetLeft);
			});
		});

		test('ループしないときは、先頭で前へ・末尾で次へを押せない', () => {
			const { button, markers } = mount({ slides: 3 });
			handle = setupCarousels({}, POLYFILL);

			expect(button('previous')!.disabled).toBe(true);
			expect(button('next')!.disabled).toBe(false);

			markers()[2]!.click();

			expect(button('previous')!.disabled).toBe(false);
			expect(button('next')!.disabled).toBe(true);
		});

		test('ループするときは、先頭で前へを押すと末尾へ、末尾で次へを押すと先頭へ戻る', () => {
			const { button, current } = mount({ loop: true, slides: 3 });
			handle = setupCarousels({}, POLYFILL);
			expect(button('previous')!.disabled).toBe(false);

			button('previous')!.click();
			expect(current()).toBe(2);

			button('next')!.click();
			expect(current()).toBe(0);
		});

		test('表示枚数が 2 以上のときは、矢印で表示枚数分ずつ進み、末尾は最後の 1 画面で止まる', () => {
			const { button, markers, current } = mount({ perView: 2, slides: 5 });
			handle = setupCarousels({}, POLYFILL);

			const active = () =>
				markers()
					.map((m, i) => (m.getAttribute('aria-current') === 'true' ? i : -1))
					.filter((i) => i >= 0);

			// 標準の ::scroll-marker と同じく、表示枚数に関わらず現在の 1 枚だけを示す
			expect(active()).toEqual([0]);
			button('next')!.click();
			expect(active()).toEqual([2]);
			button('next')!.click();
			// 5 枚・2 枚表示の最後の 1 画面は 4〜5 枚目
			expect(active()).toEqual([3]);
			expect(current()).toBe(3);
			expect(button('next')!.disabled).toBe(true);
		});

		test('表示枚数がスライド数より多いときは、全スライドを 1 画面として扱う', () => {
			const { button } = mount({ perView: 5, slides: 3 });
			handle = setupCarousels({}, POLYFILL);

			expect(button('previous')!.disabled).toBe(true);
			expect(button('next')!.disabled).toBe(true);
		});

		test('手でスクロールしたときも、現在のドットが追従する', async () => {
			const { list, slides, current } = mount();
			handle = setupCarousels({}, POLYFILL);

			list.scrollTo({
				left: slides[3]!.offsetLeft - slides[0]!.offsetLeft,
				behavior: 'instant',
			});

			await vi.waitFor(() => {
				expect(current()).toBe(3);
			});
		});

		test('スライド効果では、画面外のスライドに inert を付けない（Tab で移るとブラウザがスクロールする）', () => {
			const { slides, button } = mount();
			handle = setupCarousels({}, POLYFILL);

			button('next')!.click();

			expect(slides.some((s) => s.inert)).toBe(false);
		});
	});

	describe('フェード', () => {
		test('表示中のスライドだけに current を付け、ほかは inert にする', () => {
			const { el, slides, button } = mount({ effect: 'fade', slides: 3 });
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

		test('表示枚数の設定に関わらず 1 枚ずつ切り替える', () => {
			const { slides, button } = mount({ effect: 'fade', perView: 3, slides: 4 });
			handle = setupCarousels({}, POLYFILL);

			button('next')!.click();

			expect(slides.map((s) => Object.hasOwn(s.dataset, 'bgeCarouselCurrent'))).toEqual([
				false,
				true,
				false,
				false,
			]);
		});

		test('重ねて表示する（スクロールしない）', () => {
			const { list, slides } = mount({ effect: 'fade' });
			handle = setupCarousels({}, POLYFILL);

			expect(list.scrollWidth).toBe(list.clientWidth);
			expect(slides[1]!.offsetLeft).toBe(slides[0]!.offsetLeft);
		});
	});

	describe('自動再生', () => {
		test('再生・停止ボタンを Tab 順の先頭（スライドより前）に置き、間隔ごとに次へ進む', () => {
			vi.useFakeTimers();
			const { el, list, button, current } = mount({ autoplay: true });
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

		test('末尾ではループの設定に関わらず先頭に戻る', () => {
			vi.useFakeTimers();
			const { current } = mount({ autoplay: true, loop: false, slides: 2 });
			handle = setupCarousels({ interval: 1000 }, POLYFILL);

			vi.advanceTimersByTime(1000);
			expect(current()).toBe(1);
			vi.advanceTimersByTime(1000);
			expect(current()).toBe(0);
		});

		test('停止ボタンで止まり、再生ボタンで再開する', () => {
			vi.useFakeTimers();
			const { button, current } = mount({ autoplay: true });
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

		test('ポインターが載っている間は止まる', () => {
			vi.useFakeTimers();
			const { el, current } = mount({ autoplay: true });
			handle = setupCarousels({ interval: 1000 }, POLYFILL);

			el.dispatchEvent(new PointerEvent('pointerenter'));
			vi.advanceTimersByTime(3000);
			expect(current()).toBe(0);

			el.dispatchEvent(new PointerEvent('pointerleave'));
			vi.advanceTimersByTime(1000);
			expect(current()).toBe(1);
		});

		test('フォーカスが中にある間は止まり、外へ出ると再開する', () => {
			vi.useFakeTimers();
			const { button, current } = mount({ autoplay: true });
			handle = setupCarousels({ interval: 1000 }, POLYFILL);

			button('next')!.focus();
			vi.advanceTimersByTime(3000);
			expect(current()).toBe(0);

			// 中での移動では再開しない（前へは先頭で disabled なので、再生・停止ボタンへ移す）
			button('play')!.focus();
			expect(document.activeElement).toBe(button('play'));
			vi.advanceTimersByTime(3000);
			expect(current()).toBe(0);

			button('play')!.blur();
			vi.advanceTimersByTime(1000);
			expect(current()).toBe(1);
		});

		test('マウスで停止・再生ボタンを押したときは、ボタンにフォーカスが残っていても再開する', async () => {
			const { button, current } = mount({ autoplay: true });
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
			play
				.closest('[data-bge-per-view]')!
				.dispatchEvent(new PointerEvent('pointerleave'));

			await vi.waitFor(() => {
				expect(current()).toBeGreaterThan(0);
			});
		});

		test('スライド内のダイアログ（画像モーダル）を開いている間は進まず、閉じると再開する', () => {
			vi.useFakeTimers();
			const { slides, current } = mount({ autoplay: true, effect: 'fade' });
			const dialog = document.createElement('dialog');
			slides[0]!.append(dialog);
			handle = setupCarousels({ interval: 1000 }, POLYFILL);

			// タッチで開いた想定（ポインターもキーボードフォーカスも止める条件にならない）
			dialog.show();
			vi.advanceTimersByTime(3000);
			expect(current()).toBe(0);
			expect(slides[0]!.inert).toBe(false);

			dialog.close();
			vi.advanceTimersByTime(1000);
			expect(current()).toBe(1);
		});

		test('停止ボタンで止めたあとは、ポインターが離れても再開しない', () => {
			vi.useFakeTimers();
			const { el, button, current } = mount({ autoplay: true });
			handle = setupCarousels({ interval: 1000 }, POLYFILL);

			button('play')!.click();
			el.dispatchEvent(new PointerEvent('pointerenter'));
			el.dispatchEvent(new PointerEvent('pointerleave'));
			vi.advanceTimersByTime(3000);
			expect(current()).toBe(0);
		});

		test('動きを減らす設定のときは、止まった状態で始まる', () => {
			vi.useFakeTimers();
			const { button, current } = mount({ autoplay: true });
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

		test('標準の疑似要素に対応するブラウザでも、再生・停止ボタンは生成する', () => {
			const { el, button } = mount({ autoplay: true });
			handle = setupCarousels({}, NATIVE);

			expect(button('play')).not.toBeNull();
			expect(Object.hasOwn(el.dataset, 'bgeCarouselControls')).toBe(false);
		});

		test('自動再生しない設定では、再生・停止ボタンを生成しない', () => {
			const { button } = mount({ autoplay: false });
			handle = setupCarousels({}, POLYFILL);

			expect(button('play')).toBeNull();
		});
	});

	test('destroy でタイマーを止め、生成した要素と付けた属性を元に戻す', () => {
		vi.useFakeTimers();
		const { el } = mount({ autoplay: true, effect: 'fade' });
		const before = document.body.innerHTML;
		const instance = setupCarousels({ interval: 1000 }, POLYFILL);

		instance.destroy();
		vi.advanceTimersByTime(3000);

		expect(document.body.innerHTML).toBe(before);
		expect(el.querySelector('[data-bge-carousel-current]')).toBeNull();
	});

	test('Symbol.dispose が使える環境では、destroy と同じ後始末を Symbol.dispose でも呼べる', () => {
		mount({ effect: 'fade' });
		const before = document.body.innerHTML;
		const instance = setupCarousels({}, POLYFILL) as CarouselHandle & Disposable;

		instance[Symbol.dispose]();

		expect(document.body.innerHTML).toBe(before);
	});

	test('root を指定すると、その中の carousel だけを初期化する', () => {
		const { el } = mount();
		const outside = document.createElement('div');
		document.body.append(outside);
		handle = setupCarousels({ root: outside }, POLYFILL);

		expect(el.hasAttribute('role')).toBe(false);
	});
});

describe('initBurgerEditorRuntime', () => {
	test('既定で carousel を初期化する', () => {
		const { el } = mount();
		initBurgerEditorRuntime({ imageModal: false });

		expect(el.getAttribute('aria-roledescription')).toBe('carousel');
	});

	test('carousel: false で初期化しない', () => {
		const { el } = mount();
		initBurgerEditorRuntime({ imageModal: false, carousel: false });

		expect(el.hasAttribute('aria-roledescription')).toBe(false);
	});
});
