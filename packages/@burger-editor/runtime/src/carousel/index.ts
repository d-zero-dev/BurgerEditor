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
 * - 自動再生: WAI-ARIA APG の Carousel パターンに従い、再生・停止ボタンを Tab 順の
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
 
/**
 * Carousel Configuration
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
	 * Autoplay interval in milliseconds
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
	 * (otherwise the dot is named by the slide's caption or `alt`)
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
 */
export interface CarouselHandle {
	/**
	 * Stop timers and observers, remove generated elements and restore attributes
	 */
	destroy(): void;
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
	readonly prefersReducedMotion: boolean;
}

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
 * Reads the `data-bge-*` settings (autoplay / loop / per-view / arrows / dots / effect)
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

	const cleanups: (() => void)[] = [];
	for (const item of root.querySelectorAll<HTMLElement>(selector)) {
		const list = item.querySelector<HTMLElement>('[data-bge-list]');
		const el = list?.parentElement;
		if (!list || !el) {
			// eslint-disable-next-line no-console
			console.warn('[Carousel] Slide list not found in item:', item);
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
	if (typeof Symbol.dispose === 'symbol') {
		Object.assign(handle, { [Symbol.dispose]: destroy });
	}
	return handle;
}

/**
 *
 */
function detectEnvironment(): CarouselEnvironment {
	return {
		supportsScrollMarkers:
			typeof CSS !== 'undefined' && CSS.supports('selector(::scroll-marker)'),
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
	const perView = Number(read('per-view'));
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
 *
 * @param el
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
	const fade = settings.effect === 'fade';
	// フェードは重ねて 1 枚ずつ見せるので、表示枚数は 1 扱い
	const perView = fade ? 1 : Math.min(settings.perView, Math.max(total, 1));
	const lastStart = Math.max(total - perView, 0);
	const restores: (() => void)[] = [];
	const generated: Element[] = [];
	const listeners = new AbortController();
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
		restores.push(setAttr(slide, 'aria-roledescription', 'slide'));
		const caption = slide.querySelector('figcaption');
		const img = slide.querySelector('img');
		// HTML-AAM では figure の名前は figcaption から付くが、Chromium はそれを計算しない。
		// 標準の `::scroll-marker` はスライドの名前を引き継ぐので、名前が無いとドットが
		// 名前なしになる。キャプションのときも aria-labelledby で明示する
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

	let current = 0;

	const needsControls =
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
		if (fade) {
			setCurrent(target);
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
		// スクロールの完了を待たずに位置を確定する。続けて押されたときに同じ位置へ戻らないため
		setCurrent(target);
	};

	const step = (delta: -1 | 1) => {
		const amount = perView * delta;
		let target = current + amount;
		if (target > lastStart) {
			target = current >= lastStart && settings.loop ? 0 : lastStart;
		} else if (target < 0) {
			target = current <= 0 && settings.loop ? lastStart : 0;
		}
		goTo(target);
	};

	const setCurrent = (index: number) => {
		current = index;
		if (fade) {
			for (const [i, slide] of slides.entries()) {
				const active = i === index;
				slide.toggleAttribute('data-bge-carousel-current', active);
				slide.inert = !active;
			}
		}
		if (previous && next && !settings.loop) {
			previous.disabled = index <= 0;
			next.disabled = index >= lastStart;
		}
		// 標準の `::scroll-marker` と同じく、表示枚数に関わらず現在の 1 枚だけを示す
		for (const [i, marker] of markers.entries()) {
			if (i === index) {
				marker.setAttribute('aria-current', 'true');
			} else {
				marker.removeAttribute('aria-current');
			}
		}
	};

	// 再生・停止ボタンは Tab 順の先頭（スライドより前）に置く
	let playButton: HTMLButtonElement | null = null;
	if (settings.autoplay) {
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
			// 名前は保存時にキャプション（空なら alt）から導いた `data-bge-slide-label` の
			// 文字から付ける（標準の `::scroll-marker` と同じ元）。aria-labelledby で
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
		const visible = new Set<number>();
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
				if (visible.size > 0) {
					setCurrent(Math.min(Math.min(...visible), lastStart));
				}
			},
			{ root: list, threshold: 0.5 },
		);
		for (const slide of slides) {
			observer.observe(slide);
		}
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
		if (timer != null) {
			clearInterval(timer);
		}
		for (const node of generated) {
			node.remove();
		}
		for (const slide of slides) {
			delete slide.dataset.bgeCarouselCurrent;
			slide.inert = false;
		}
		for (const restore of restores.toReversed()) {
			restore();
		}
	};
}
