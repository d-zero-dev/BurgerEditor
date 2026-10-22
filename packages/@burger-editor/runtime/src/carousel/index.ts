/**
 * carousel アイテムの公開ページ側の動作。
 *
 * 見た目と基本の操作は `@burger-editor/blocks` の `carousel/style.css` が CSS だけで
 * 持つ（scroll snap による横スクロール、対応ブラウザでは `::scroll-button()` /
 * `::scroll-marker` による矢印とドット）。ここでは CSS だけでは表現できないものを補う。
 *
 * - 矢印とドット: 標準の疑似要素に対応していないブラウザ、ループ（標準の矢印は
 *   端で押せなくなり、先頭へ戻れない）、フェード（スクロールしないので疑似要素が
 *   出ない）のとき、`<button>` を生成する。生成したときはラッパーに
 *   `data-bge-carousel-controls` を付け、CSS が標準の疑似要素を出さないようにする
 * - 自動再生: WAI-ARIA APG の Carousel パターン
 *   （https://www.w3.org/WAI/ARIA/apg/patterns/carousel/）に従い、再生・停止ボタンを Tab 順の
 *   先頭に置き、キーボードフォーカスが入っている間とポインターが載っている間は止める
 * - フェード: スライドを重ね、表示中以外に `inert` を付ける。スライド効果では
 *   `inert` を付けない。scroll snap では Tab で画面外のリンクに移るとブラウザが
 *   そのスライドまでスクロールするため、`inert` を付けると到達できなくなる
 *
 * スライドの複製は作らない（ループは先頭へ巻き戻す）。DOM と支援技術から見える
 * スライド数を一致させるため。
 *
 * アクセシブルな名前は、作者が書いた内容から付ける（`aria-label` を使わない）。
 * スライドは `figure` のまま、`aria-labelledby` で `figcaption`（空なら画像の `alt`）を
 * 指して名前を得る。ドットは、保存時にキャプション（空なら alt）から導かれる
 * `data-bge-slide-label` の文字を名前にする（標準の `::scroll-marker` も CSS の
 * `attr()` で同じ属性を使うので、両者が揃う）。
 * 生成するボタンは中の文字を名前にする。外枠は作者由来の名前の元が無いため名前を
 * 付けず、名前が必須の `region` ではなく `group` にする。
 *
 * Invoker Commands API に対応していないブラウザでは、操作部品を生成しない（ボタンが
 * 動かず、CSS がスクロールバーも隠すため）。自動再生も、止める手段を出せないので行わない。
 * CSS だけの横スクロールとスナップで表示する。
 */

/**
 * Carousel Configuration
 * @example
 * ```typescript
 * const config: CarouselConfig = {
 *   root: document.querySelector('main') ?? document,
 *   interval: 8000,
 *   previousLabel: 'Previous slide',
 *   nextLabel: 'Next slide',
 * };
 * initCarousel(config);
 * ```
 */
export interface CarouselConfig {
	/**
	 * CSS selector for carousel items
	 * @default '[data-bgi="carousel"]'
	 */
	selector?: string;

	/**
	 * Element to search for carousel items in
	 * @default document
	 */
	root?: ParentNode;

	/**
	 * Autoplay interval in milliseconds. A value that is not a positive finite number
	 * falls back to the default
	 * @default 5000
	 */
	interval?: number;

	/**
	 * Text of the previous button
	 * @default '前のスライド'
	 */
	previousLabel?: string;

	/**
	 * Text of the next button
	 * @default '次のスライド'
	 */
	nextLabel?: string;

	/**
	 * Text of a dot whose slide has neither a caption nor an image `alt`
	 * (otherwise the dot is named by the slide's caption or `alt`).
	 * `index` is 1-based
	 * @default (index) => `スライド ${index}`
	 */
	markerLabel?: (index: number) => string;

	/**
	 * Text of the play button (shown while paused)
	 * @default '自動再生を開始'
	 */
	playLabel?: string;

	/**
	 * Text of the pause button (shown while playing)
	 * @default '自動再生を停止'
	 */
	pauseLabel?: string;
}

/**
 * Handle returned by {@link initCarousel} to undo the initialization
 * @example
 * ```typescript
 * const carousel = initCarousel({ root: container });
 * // Before replacing the content of `container`
 * carousel.destroy();
 * ```
 */
export interface CarouselHandle {
	/**
	 * Stop timers and observers, remove generated elements and restore attributes
	 */
	destroy(): void;

	/**
	 * The same as {@link CarouselHandle.destroy}, so the handle works with `using`.
	 * Present only where the browser provides `Symbol.dispose`
	 * (Explicit Resource Management is not Baseline yet)
	 */
	[Symbol.dispose]?(): void;
}

type Options = Required<Omit<CarouselConfig, 'selector' | 'root'>>;

interface Settings {
	readonly autoplay: boolean;
	readonly loop: boolean;
	readonly perView: number;
	readonly arrows: boolean;
	readonly dots: boolean;
	readonly effect: 'slide' | 'fade';
}

/**
 * ブラウザの機能。テストで標準の疑似要素に対応しない側を確かめるために差し替える
 */
export interface CarouselEnvironment {
	readonly supportsScrollMarkers: boolean;
	readonly supportsInvokerCommands: boolean;
	readonly prefersReducedMotion: boolean;
}

// 前へ・次への既定の文言は、blocks の carousel/style.css が標準の ::scroll-button() の
// 代替テキストに直書きしている文言と揃える
const DEFAULT_OPTIONS: Options = {
	interval: 5000,
	previousLabel: '前のスライド',
	nextLabel: '次のスライド',
	markerLabel: (index) => `スライド ${index}`,
	playLabel: '自動再生を開始',
	pauseLabel: '自動再生を停止',
};

/**
 * Initialize carousel items saved by BurgerEditor
 *
 * Reads the `data-bge-*` settings (autoplay / loop / arrows / dots / effect) and the
 * `--per-view` custom property
 * of each carousel item and adds what CSS alone cannot provide: arrows and dots on
 * browsers without `::scroll-button()` / `::scroll-marker`, looping, autoplay with a
 * play/pause button, the fade effect and ARIA roles. Without this function the
 * carousel still scrolls and snaps with CSS only.
 * @param config - Configuration options
 * @returns A handle to undo the initialization
 * @example
 * ```typescript
 * import { initCarousel } from '@burger-editor/runtime';
 *
 * // Basic usage
 * initCarousel();
 *
 * // Scope and undo (e.g. for a client-side rendered page)
 * const carousel = initCarousel({ root: container, interval: 8000 });
 * carousel.destroy();
 * ```
 */
export function initCarousel(config: CarouselConfig = {}): CarouselHandle {
	return setupCarousels(config, detectEnvironment());
}

/**
 * {@link initCarousel} の本体。ブラウザの機能を引数で受け取る
 * @param config
 * @param env
 */
export function setupCarousels(
	config: CarouselConfig,
	env: CarouselEnvironment,
): CarouselHandle {
	const { selector = '[data-bgi="carousel"]', root = document, ...rest } = config;
	const options: Options = { ...DEFAULT_OPTIONS };
	for (const [key, value] of Object.entries(rest)) {
		if (value !== undefined) {
			Object.assign(options, { [key]: value });
		}
	}
	// 0 以下や NaN を渡すと setInterval がほぼ連続で発火するので、既定値に戻す
	if (!Number.isFinite(options.interval) || options.interval <= 0) {
		options.interval = DEFAULT_OPTIONS.interval;
	}

	const cleanups: (() => void)[] = [];
	for (const item of root.querySelectorAll<HTMLElement>(selector)) {
		const list = item.querySelector<HTMLElement>('[data-bge-list]');
		const el = list?.parentElement;
		if (!list || !el) {
			// eslint-disable-next-line no-console
			console.warn('[Carousel] Slide list not found in item:', item);
			continue;
		}
		// 初期化済みのものは飛ばす（二重に初期化するとボタンとリスナーが重複し、1 回の操作で 2 つ進む）
		if (Object.hasOwn(el.dataset, 'bgeCarouselReady')) {
			continue;
		}
		cleanups.push(setupCarousel(el, list, readSettings(el), options, env));
	}

	const destroy = () => {
		for (const cleanup of cleanups.splice(0)) {
			cleanup();
		}
	};
	const handle: CarouselHandle = { destroy };
	// Explicit Resource Management は Baseline ではない（Safari が未対応）ので、
	// destroy を本体にし、Symbol.dispose は存在する環境でだけ同じ処理を指す
	if (typeof Symbol.dispose === 'symbol') {
		Object.assign(handle, { [Symbol.dispose]: destroy });
	}
	return handle;
}

/**
 * ブラウザの機能を調べる。テストでは {@link setupCarousels} に直接渡して差し替える
 */
function detectEnvironment(): CarouselEnvironment {
	return {
		supportsScrollMarkers:
			typeof CSS !== 'undefined' && CSS.supports('selector(::scroll-marker)'),
		supportsInvokerCommands: 'command' in HTMLButtonElement.prototype,
		prefersReducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
	};
}

/**
 * 保存時の値は `JSON.parse` できる形（`true` / `false` / 数値 / 文字列）
 * @param el
 */
function readSettings(el: HTMLElement): Settings {
	const read = (name: string): unknown => {
		const value = el.getAttribute(`data-bge-${name}`);
		if (value == null) {
			return;
		}
		try {
			return JSON.parse(value);
		} catch {
			return value;
		}
	};
	// 表示枚数は保存 HTML の `style` の `--per-view` だけが持つ。計算後の値を読むので、
	// サイトの CSS がメディアクエリーなどで上書きした値（レイアウトに効いている値）に揃う
	const perView = Number(getComputedStyle(el).getPropertyValue('--per-view'));
	return {
		autoplay: read('autoplay') === true,
		loop: read('loop') === true,
		perView: Number.isFinite(perView) ? Math.max(1, Math.floor(perView)) : 1,
		arrows: read('arrows') !== false,
		dots: read('dots') !== false,
		effect: read('effect') === 'fade' ? 'fade' : 'slide',
	};
}

/**
 * 名前の中で区切り（空白）にする要素。改行とブロック要素。`@burger-editor/blocks` の
 * `carousel/slides.ts` の同名の定数と同じ一覧にする（runtime は他のパッケージに依存
 * できないので写して持つ。両者が同じ名前を導くことは runtime のテストが確かめる）
 */
const LABEL_BOUNDARIES =
	'br, hr, p, div, li, dt, dd, ul, ol, dl, h1, h2, h3, h4, h5, h6, blockquote, pre, table, tr, td, th, section, article, aside, header, footer, nav';

/**
 * スライドの名前（キャプションの文字、空なら画像の alt）。`@burger-editor/blocks` の
 * carousel が保存時に導く `data-bge-slide-label` と同じ規則（改行やブロック要素の
 * 境目は空白にする）。runtime は他のパッケージに依存できないので、規則を写して持つ
 * @param caption
 * @param img
 */
function slideLabelOf(caption: Element | null, img: HTMLImageElement | null): string {
	const normalize = (text: string) => text.replaceAll(/\s+/g, ' ').trim();
	if (caption) {
		const clone = caption.cloneNode(true) as Element;
		for (const el of clone.querySelectorAll(LABEL_BOUNDARIES)) {
			el.before(' ');
			el.after(' ');
		}
		const text = normalize(clone.textContent);
		if (text) {
			return text;
		}
	}
	return normalize(img?.alt ?? '');
}

/**
 * 属性を付け、後始末で元に戻す関数を返す
 * @param el
 * @param name
 * @param value
 */
function setAttr(el: Element, name: string, value: string): () => void {
	const prev = el.getAttribute(name);
	el.setAttribute(name, value);
	return () => {
		if (prev == null) {
			el.removeAttribute(name);
		} else {
			el.setAttribute(name, prev);
		}
	};
}

/**
 * 生成するボタンが送るカスタムコマンド（Invoker Commands API）。`commandfor` で
 * カルーセルのラッパーを指し、ラッパーが `command` イベントで受け取る
 */
const COMMAND = {
	previous: '--bge-carousel-previous',
	next: '--bge-carousel-next',
	toggleAutoplay: '--bge-carousel-toggle-autoplay',
	slidePrefix: '--bge-carousel-slide-',
} as const;

/**
 * 名前はボタンの中の文字（`data-bge-carousel-text`。CSS で視覚的に隠す）から付く
 * @param area
 * @param command
 * @param targetId
 * @param text
 * @param icon - 見た目だけの記号。支援技術からは隠す
 */
function createButton(
	area: string,
	command: string,
	targetId: string,
	text: string | null,
	icon?: string,
): HTMLButtonElement {
	const button = document.createElement('button');
	button.type = 'button';
	button.setAttribute('command', command);
	button.setAttribute('commandfor', targetId);
	button.dataset.bgeCarouselButton = area;
	if (icon) {
		const span = document.createElement('span');
		span.setAttribute('aria-hidden', 'true');
		span.textContent = icon;
		button.append(span);
	}
	if (text != null) {
		const span = document.createElement('span');
		span.dataset.bgeCarouselText = '';
		span.textContent = text;
		button.append(span);
	}
	return button;
}

/**
 * カルーセル 1 つを初期化し、付けたものをすべて戻す後始末の関数を返す
 * @param el - スライドの入れ物（`data-bge-list`）の親。設定の `data-bge-*` を持つ
 * @param list
 * @param settings
 * @param options
 * @param env
 */
function setupCarousel(
	el: HTMLElement,
	list: HTMLElement,
	settings: Settings,
	options: Options,
	env: CarouselEnvironment,
): () => void {
	const slides = [...list.children].filter(
		(child): child is HTMLElement => child instanceof HTMLElement,
	);
	const total = slides.length;
	// フェードは生成した操作部品で切り替える。Invoker Commands に未対応で部品を出せない
	// ときにフェードにすると、2 枚目以降に届かなくなるので、CSS だけの横スクロールに任せる
	const fade = settings.effect === 'fade' && env.supportsInvokerCommands;
	// フェードは重ねて 1 枚ずつ見せるので、表示枚数は 1 扱い
	const clampPerView = (value: number) =>
		fade ? 1 : Math.min(value, Math.max(total, 1));
	// サイトの CSS がメディアクエリーなどで `--per-view` を変えると、表示枚数も変わる。
	// 小数は切り捨てる（保存される値は整数。上書きした小数とはスクロール位置がずれる）
	let perView = clampPerView(settings.perView);
	let lastStart = Math.max(total - perView, 0);
	const restores: (() => void)[] = [setAttr(el, 'data-bge-carousel-ready', '')];
	const generated: Element[] = [];
	const listeners = new AbortController();
	// destroy で戻すため、フェードが付け外しする前の inert を覚えておく
	const initialInert = slides.map((slide) => slide.inert);
	// Invoker Commands に対応していないと生成したボタンが動かない。操作部品も、止める
	// 手段を出せない自動再生も行わず、CSS だけの表示に任せる
	// スライドが表示枚数以下なら送る先が無いので、自動再生しない（再生・停止ボタンが
	// 「再生中」と表示したまま動かない状態を作らない）
	const autoplay = settings.autoplay && env.supportsInvokerCommands && total > perView;
	const { signal } = listeners;

	// 生成するボタンの `commandfor` が指す id。ほかの id はこれを接頭辞にする
	if (!el.id) {
		restores.push(
			setAttr(el, 'id', `bge-carousel-${Math.random().toString(36).slice(2, 11)}`),
		);
	}
	const id = el.id;
	const ensureId = (node: Element, suffix: string) => {
		if (!node.id) {
			restores.push(setAttr(node, 'id', `${id}-${suffix}`));
		}
		return node.id;
	};
	const listId = ensureId(list, 'list');

	restores.push(
		setAttr(el, 'role', 'group'),
		setAttr(el, 'aria-roledescription', 'carousel'),
	);

	for (const [i, slide] of slides.entries()) {
		const caption = slide.querySelector('figcaption');
		const img = slide.querySelector('img');
		restores.push(
			setAttr(slide, 'aria-roledescription', 'slide'),
			// ドットの名前の元。保存時にも導かれるが、`toItemData` を通らないエージェント
			// 経由の保存では古いまま残り得るので、今のキャプション・alt から読み直す
			setAttr(slide, 'data-bge-slide-label', slideLabelOf(caption, img)),
		);
		// HTML-AAM では figure の名前は figcaption から付くが、Chromium はそれを計算しない
		// （https://w3c.github.io/html-aam/#el-figure）。キャプションのときも
		// aria-labelledby で明示する
		const nameSource = caption?.textContent.trim()
			? ensureId(caption, `caption-${i}`)
			: img?.alt.trim()
				? ensureId(img, `img-${i}`)
				: null;
		if (nameSource != null) {
			restores.push(setAttr(slide, 'aria-labelledby', nameSource));
		}
	}
	if (fade) {
		restores.push(
			setAttr(el, 'data-bge-carousel-fade', ''),
			// フェードは表示中以外を inert で隠すので、切り替えで現れた中身を読み上げる。
			// 自動再生中は読み上げない（APG）。updateTimer が切り替える。
			// スライド効果では付けない。全スライドを支援技術に見せているので知らせる
			// 新しい中身が無く、スクロールのたびに読み上げると邪魔になる
			setAttr(list, 'aria-live', 'polite'),
		);
	}

	// 表示位置（先頭に見えているスライド。lastStart まで）
	let current = 0;
	// スクロールで向かっている位置。着くまでは通過するスライドで current を上書きしない
	let pending: number | null = null;
	let pendingTimer: ReturnType<typeof setTimeout> | null = null;
	// 見えているスライド（IntersectionObserver が更新する）
	const visible = new Set<number>();
	/**
	 * 見えているスライドから表示位置を求める。見えていなければ null
	 */
	const visiblePosition = () =>
		visible.size === 0 ? null : Math.min(Math.min(...visible), lastStart);
	/**
	 * スクロールが終わったとき（または終わったとみなすとき）に、見えている位置に合わせる。
	 * 位置が変わらなければ、押されたドットの表示を保つ
	 */
	const settle = () => {
		pending = null;
		if (pendingTimer != null) {
			clearTimeout(pendingTimer);
			pendingTimer = null;
		}
		const position = visiblePosition();
		if (position != null && position !== current) {
			setCurrent(position);
		}
	};
	/**
	 * JS でスクロールを始めたことを記録する。`scrollend` が無いブラウザや、途中で手で
	 * 止められて目標に着かないときに pending が残り続けないよう、一定時間で解除する
	 * @param target
	 */
	const startPending = (target: number) => {
		pending = target;
		if (pendingTimer != null) {
			clearTimeout(pendingTimer);
		}
		pendingTimer = setTimeout(settle, 1500);
	};

	const needsControls =
		env.supportsInvokerCommands &&
		(settings.arrows || settings.dots) &&
		(!env.supportsScrollMarkers || settings.loop || fade);
	if (needsControls) {
		restores.push(setAttr(el, 'data-bge-carousel-controls', ''));
	}

	let previous: HTMLButtonElement | null = null;
	let next: HTMLButtonElement | null = null;
	const markers: HTMLButtonElement[] = [];

	/**
	 * n 枚目（0 始まり）を先頭に表示する。矢印・ドット・自動再生はすべてここを通る
	 * @param index
	 */
	const goTo = (index: number) => {
		const target = Math.min(Math.max(index, 0), lastStart);
		// ドットは押されたスライドを示す。表示枚数が 2 以上で末尾の画面に収まる
		// スライドは、表示位置（target）と別になる
		const marked = Math.min(Math.max(index, 0), Math.max(total - 1, 0));
		if (fade) {
			setCurrent(target, marked);
			return;
		}
		const slide = slides[target];
		const first = slides[0];
		if (!slide || !first) {
			return;
		}
		// 1 枚目からの距離。どちらもスクロールで同じだけ動くので、スクロール位置に依存しない
		const left = slide.getBoundingClientRect().left - first.getBoundingClientRect().left;
		// 動きの有無は CSS の `scroll-behavior`（`prefers-reduced-motion` で切り替え）に任せる
		list.scrollTo({ left });
		// スクロールの完了を待たずに位置を確定する。続けて押されたときに同じ位置へ戻らないため。
		// 止まっている状態で同じ位置を指したときはスクロールが起きないので pending を付けない。
		// スクロール中に同じ位置をもう一度指したときは、着くまで pending を保つ
		if (target !== current || pending != null) {
			startPending(target);
		}
		setCurrent(target, marked);
	};

	const step = (delta: -1 | 1) => {
		if (!settings.loop && (delta < 0 ? current <= 0 : current >= lastStart)) {
			return;
		}
		const amount = perView * delta;
		let target = current + amount;
		if (target > lastStart) {
			target = current >= lastStart && settings.loop ? 0 : lastStart;
		} else if (target < 0) {
			target = current <= 0 && settings.loop ? lastStart : 0;
		}
		goTo(target);
	};

	const setCurrent = (position: number, marked = position) => {
		current = position;
		if (fade) {
			for (const [i, slide] of slides.entries()) {
				const active = i === position;
				slide.toggleAttribute('data-bge-carousel-current', active);
				slide.inert = !active;
			}
		}
		// disabled にするとフォーカス中のボタンからフォーカスが外れ、キーボード利用者が
		// 位置を失う。aria-disabled にして、押されても step が端で何もしない
		if (previous && next && !settings.loop) {
			previous.setAttribute('aria-disabled', String(position <= 0));
			next.setAttribute('aria-disabled', String(position >= lastStart));
		}
		// 標準の `::scroll-marker` と同じく、表示枚数に関わらず現在の 1 枚だけを示す
		for (const [i, marker] of markers.entries()) {
			if (i === marked) {
				marker.setAttribute('aria-current', 'true');
			} else {
				marker.removeAttribute('aria-current');
			}
		}
	};

	// 再生・停止ボタンは Tab 順の先頭（スライドより前）に置く
	let playButton: HTMLButtonElement | null = null;
	if (autoplay) {
		playButton = createButton(
			'play',
			COMMAND.toggleAutoplay,
			id,
			options.pauseLabel,
			'❚❚',
		);
		list.before(playButton);
		generated.push(playButton);
	}

	if (needsControls && settings.arrows) {
		previous = createButton('previous', COMMAND.previous, id, options.previousLabel, '‹');
		next = createButton('next', COMMAND.next, id, options.nextLabel, '›');
		previous.setAttribute('aria-controls', listId);
		next.setAttribute('aria-controls', listId);
	}

	let markerGroup: HTMLElement | null = null;
	if (needsControls && settings.dots) {
		markerGroup = document.createElement('div');
		markerGroup.dataset.bgeCarouselMarkers = '';
		for (const [i, slide] of slides.entries()) {
			// 名前は、上で今のキャプション（空なら alt）から読み直した `data-bge-slide-label`
			// の文字から付ける（標準の `::scroll-marker` と同じ元）。aria-labelledby で
			// スライド内を指すと、フェードで inert のスライドを指したとき名前が失われる
			const label = slide.dataset.bgeSlideLabel?.trim();
			const marker = createButton(
				'marker',
				`${COMMAND.slidePrefix}${i}`,
				id,
				label || options.markerLabel(i + 1),
			);
			marker.setAttribute('aria-controls', listId);
			markers.push(marker);
			markerGroup.append(marker);
		}
	}

	const after = [previous, markerGroup, next].filter((node) => node != null);
	list.after(...after);
	generated.push(...after);

	// 現在位置は、手でスクロールしたときも JS で動かしたときも同じ経路で追う
	let observer: IntersectionObserver | null = null;
	if (!fade && typeof IntersectionObserver !== 'undefined') {
		list.addEventListener('scrollend', settle, { signal });
		observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					const index = slides.indexOf(entry.target as HTMLElement);
					if (entry.isIntersecting) {
						visible.add(index);
					} else {
						visible.delete(index);
					}
				}
				const position = visiblePosition();
				if (position == null) {
					return;
				}
				if (pending != null) {
					// JS で動かしている途中。通過するスライドでは更新しない
					if (position === pending) {
						settle();
					}
					return;
				}
				setCurrent(position);
			},
			{ root: list, threshold: 0.5 },
		);
		for (const slide of slides) {
			observer.observe(slide);
		}
	}

	// 表示枚数を CSS に合わせ直す（メディアクエリーなどで `--per-view` が変わったとき）
	let resizeObserver: ResizeObserver | null = null;
	if (!fade && typeof ResizeObserver !== 'undefined') {
		resizeObserver = new ResizeObserver(() => {
			const value = Number(getComputedStyle(el).getPropertyValue('--per-view'));
			const next = clampPerView(
				Number.isFinite(value) ? Math.max(1, Math.floor(value)) : 1,
			);
			if (next === perView) {
				return;
			}
			perView = next;
			lastStart = Math.max(total - perView, 0);
			setCurrent(Math.min(current, lastStart));
		});
		resizeObserver.observe(list);
	}

	setCurrent(0);

	// 自動再生
	let timer: ReturnType<typeof setInterval> | null = null;
	// 利用者が停止ボタンを押したか。押したらホバーやフォーカスが外れても再開しない
	let stoppedByUser = env.prefersReducedMotion;
	let hovering = false;
	let focusing = false;

	const advance = () => {
		// スライド内のダイアログ（画像モーダル）を開いている間は進めない。タッチで開くと
		// ポインターもキーボードフォーカスも止める条件にならず、裏で切り替わってしまう。
		// フェードでは開いているダイアログのスライドが inert になり、閉じられなくなる
		if (el.querySelector('dialog[open]')) {
			return;
		}
		// 自動再生は、ループの有無に関わらず末尾で先頭に戻る（止まると再生中なのに動かない）
		goTo(current >= lastStart ? 0 : current + perView);
	};

	const updateTimer = () => {
		const shouldRun = !stoppedByUser && !hovering && !focusing && total > perView;
		if (shouldRun && timer == null) {
			timer = setInterval(advance, options.interval);
		} else if (!shouldRun && timer != null) {
			clearInterval(timer);
			timer = null;
		}
		if (fade) {
			list.setAttribute('aria-live', timer == null ? 'polite' : 'off');
		}
	};

	const updatePlayButton = () => {
		if (!playButton) {
			return;
		}
		const icon = playButton.querySelector('[aria-hidden="true"]');
		if (icon) {
			icon.textContent = stoppedByUser ? '▶' : '❚❚';
		}
		const text = playButton.querySelector('[data-bge-carousel-text]');
		if (text) {
			text.textContent = stoppedByUser ? options.playLabel : options.pauseLabel;
		}
		playButton.dataset.bgeCarouselState = stoppedByUser ? 'paused' : 'playing';
	};

	el.addEventListener(
		'command',
		(event) => {
			const { command } = event;
			switch (command) {
				case COMMAND.previous: {
					step(-1);
					return;
				}
				case COMMAND.next: {
					step(1);
					return;
				}
				case COMMAND.toggleAutoplay: {
					stoppedByUser = !stoppedByUser;
					updatePlayButton();
					updateTimer();
					return;
				}
			}
			if (command.startsWith(COMMAND.slidePrefix)) {
				const index = Number(command.slice(COMMAND.slidePrefix.length));
				if (Number.isInteger(index)) {
					goTo(index);
				}
			}
		},
		{ signal },
	);

	if (playButton) {
		el.addEventListener(
			'pointerenter',
			() => {
				hovering = true;
				updateTimer();
			},
			{ signal },
		);
		el.addEventListener(
			'pointerleave',
			() => {
				hovering = false;
				updateTimer();
			},
			{ signal },
		);
		el.addEventListener(
			'focusin',
			(event) => {
				// 止めるのはキーボードでフォーカスが入ったときだけ（APG）。マウスで押した
				// ボタンにもフォーカスが移るブラウザでは、再生ボタンを押しても再開しなくなるため
				if (event.target instanceof Element && event.target.matches(':focus-visible')) {
					focusing = true;
					updateTimer();
				}
			},
			{ signal },
		);
		el.addEventListener(
			'focusout',
			(event) => {
				if (event.relatedTarget instanceof Node && el.contains(event.relatedTarget)) {
					return;
				}
				focusing = false;
				updateTimer();
			},
			{ signal },
		);
		updatePlayButton();
		updateTimer();
	}

	return () => {
		listeners.abort();
		observer?.disconnect();
		resizeObserver?.disconnect();
		if (pendingTimer != null) {
			clearTimeout(pendingTimer);
		}
		if (timer != null) {
			clearInterval(timer);
		}
		for (const node of generated) {
			node.remove();
		}
		for (const [i, slide] of slides.entries()) {
			delete slide.dataset.bgeCarouselCurrent;
			slide.inert = initialInert[i] ?? false;
		}
		for (const restore of restores.toReversed()) {
			restore();
		}
	};
}
