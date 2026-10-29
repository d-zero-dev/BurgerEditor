/**
 * ギャラリータイプのスライドショー。
 *
 * 保存済みページは長らく jQuery 製スライダーの Psycle で動いてきたので、
 * 生成する DOM と利用者から見える振る舞いを Psycle に揃えている。保存 HTML と
 * サイト側 CSS がそれに依存しているため:
 *
 * - マーカーは `ul.bgt-gallery-marker > li`（`[data-bgt="gallery"]` の末尾）。現在の `li` と
 *   パネル `.bgt-gallery__item` 自身に `current` を付ける。サムネイルは `li` の
 *   `background-image`
 * - コントローラは `.bgt-gallery-ctrl` に `__prev` / `__next` のボタン。先頭・末尾で
 *   `bgt-gallery-ctrl__state-is-first` / `-last` を付ける（ループ再生でも付ける）
 * - `current` と状態クラスの更新は遷移の終了時。遷移中の操作は無視する
 * - 自動再生は遷移が終わるたびに `delay` 後の次を予約する（周期は `delay` + `duration`）。
 *   ホバーや手動操作で止まらない
 * - fade は入るパネルと出るパネルの opacity を同時に動かす（crossFade）。z-index は
 *   通常 0、現在 10、遷移中の入るパネル 20
 * - slide は前後にパネルの複製を置き、末尾→先頭も同じ方向へ流す。複製の数はステージ幅と
 *   コンテナ幅の比から決める。タッチのドラッグとスワイプ（パネル幅の 25% か、200ms 以内に
 *   5px 超）で移動する。マウスのドラッグには対応しない
 * - イージングは jQuery の `swing`
 *
 * Psycle と違うのは次の点だけ:
 *
 * - 壊れた属性: 不明な効果は `slide`、数値でない時間は Psycle の既定値（duration 600 /
 *   delay 3000）に倒し、パネルが 1 枚なら自動再生しない。Psycle は例外を投げたり 0ms で
 *   回り続けたりしていた
 * - 表示中のパネルへの移動（同じマーカーをもう一度押す）で `current` を外したままにしない
 * - 自動再生を再開したら「停止中」の印を戻す。Psycle は戻さないため、一度スワイプすると
 *   以後のウィンドウリサイズのたびに同じ番号への移動と再生のやり直しが起きていた
 * - ドラッグ後の戻り遷移中も他の操作を受け付けない。Psycle は遷移中の印を落としていた
 * - 非表示（`display: none` の中など）で初期化されたときは計測せず、幅が出た時点で計測する。
 *   Psycle は幅 0 のまま並べ、ウィンドウリサイズまで直らなかった
 */

import { px, wrap } from './util.js';

type Effect = 'fade' | 'slide';

interface Config {
	readonly effect: Effect;
	readonly duration: number;
	readonly delay: number;
	auto: boolean;
}

type ReflowTiming =
	'init' | 'load' | 'transitionEnd' | 'resizeStart' | 'resize' | 'resizeEnd';

interface Transition {
	init(slider: Slider): void;
	reflow(slider: Slider, timing: ReflowTiming): void;
	fire(slider: Slider): Tween;
	after(slider: Slider): void;
}

interface Tween {
	/**
	 * 完了時（stop() で止めたときも）に同期で呼ぶ処理を登録する
	 */
	done(callback: () => void): void;
	stop(): void;
}

const DEFAULT_DURATION = 600;
const DEFAULT_DELAY = 3000;
const CURRENT_CLASS = 'current';
const RESIZE_END_DELAY = 300;
const BOUND_ATTR = 'data-bge-gallery-bound';

/**
 * ギャラリーのスライドショーを初期化する
 * @param _ インデックス（未使用）
 * @param el ギャラリーのルート要素
 */
export function gallery(this: HTMLElement, _: number, el: HTMLElement) {
	const stage = el.querySelector<HTMLElement>('.bgt-gallery');
	const container = stage?.querySelector<HTMLElement>('.bgt-gallery__group');
	if (!stage || !container) {
		return;
	}
	// 同じギャラリーを二度初期化しない（マーカーとコントローラが重複し、リスナーが積み上がる）
	if (el.hasAttribute(BOUND_ATTR)) {
		return;
	}
	el.setAttribute(BOUND_ATTR, '');
	const panels = [...container.querySelectorAll<HTMLElement>('.bgt-gallery__item')];

	const attr = (name: string) => stage.getAttribute(`data-gallery-${name}`) ?? '';
	const int = (value: string, fallback: number) => {
		const n = Number.parseInt(value, 10);
		return Number.isFinite(n) ? n : fallback;
	};

	const slider = new Slider(stage, container, panels, {
		effect: attr('effect') === 'fade' ? 'fade' : 'slide',
		duration: int(attr('duration'), DEFAULT_DURATION),
		delay: int(attr('delay'), DEFAULT_DELAY),
		auto: attr('autoplay') === 'true',
	});

	const marker = el.ownerDocument.createElement('ul');
	marker.className = 'bgt-gallery-marker';
	const items = panels.map((panel, i) => {
		const li = el.ownerDocument.createElement('li');
		const img = panel.querySelector('img');
		if (img?.src) {
			li.style.backgroundImage = `url("${img.src}")`;
		}
		li.addEventListener('click', (e) => {
			slider.gotoPanel(i);
			e.preventDefault();
		});
		marker.append(li);
		return li;
	});
	const markCurrent = () => {
		for (const [i, li] of items.entries()) {
			li.classList.toggle(CURRENT_CLASS, i === slider.index);
		}
	};
	markCurrent();
	slider.onChangeEnd(markCurrent);
	el.append(marker);

	if (attr('ctrl') === 'true') {
		const ctrl = el.ownerDocument.createElement('div');
		ctrl.className = 'bgt-gallery-ctrl';
		ctrl.innerHTML =
			'<button class="bgt-gallery-ctrl__prev"><span>Prev</span></button><button class="bgt-gallery-ctrl__next"><span>Next</span></button>';
		stage.append(ctrl);
		ctrl.addEventListener('click', (e) => {
			const target = e.target instanceof Element ? e.target : null;
			if (target?.closest('.bgt-gallery-ctrl__prev')) {
				slider.prev();
				e.preventDefault();
			} else if (target?.closest('.bgt-gallery-ctrl__next')) {
				slider.next();
				e.preventDefault();
			}
		});
		const addStatus = () => {
			ctrl.classList.toggle('bgt-gallery-ctrl__state-is-first', slider.index === 0);
			ctrl.classList.toggle(
				'bgt-gallery-ctrl__state-is-last',
				slider.index === slider.length - 1,
			);
		};
		slider.onChangeEnd(addStatus);
		addStatus();
	}
}

/**
 * スライダー本体。遷移の進行・自動再生・リサイズを扱い、効果ごとの描画は {@link Transition} に任せる
 */
class Slider {
	animation: Tween | null = null;
	cloneCount = 0;
	duration: number;
	from = 0;
	index = 0;
	isPaused = false;
	isTransition = false;
	panelWidth = 0;
	stageWidth = 0;
	to = 0;

	vector = 0;

	readonly clones: HTMLElement[] = [];
	readonly config: Config;
	readonly container: HTMLElement;
	readonly length: number;
	readonly panels: readonly HTMLElement[];
	readonly stage: HTMLElement;

	readonly #changeEndListeners: (() => void)[] = [];
	#timer: ReturnType<typeof setTimeout> | null = null;
	readonly #transition: Transition;

	/**
	 * @param stage
	 * @param container
	 * @param panels
	 * @param config
	 */
	constructor(
		stage: HTMLElement,
		container: HTMLElement,
		panels: readonly HTMLElement[],
		config: Config,
	) {
		this.stage = stage;
		this.container = container;
		this.panels = panels;
		this.config = config;
		this.duration = config.duration;
		this.length = panels.length;
		this.#transition = config.effect === 'fade' ? fade : slide;

		this.#resizeable();
		this.#transition.init(this);
		this.#transition.reflow(this, 'init');
		this.#silent();
		void this.#whenImagesLoaded().then(() => {
			this.#transition.reflow(this, 'load');
		});
		// 自動再生の開始を 1 ティック遅らせるのは Psycle と同じ。初期化直後の同期処理
		// （マーカーやコントローラの生成）が終わってから最初の遷移を予約する
		setTimeout(() => {
			if (this.config.auto) {
				this.play();
			}
		}, 0);
	}

	/**
	 * @param count
	 */
	cloneAfter(count: number) {
		this.panels.at(-1)?.after(...this.#clone(count));
	}
	/**
	 * @param count
	 */
	cloneBefore(count: number) {
		this.panels[0]?.before(...this.#clone(count));
	}
	/**
	 * 遷移をその位置で止める
	 */
	freeze() {
		this.animation?.stop();
		this.stop();
	}
	/**
	 * @param to 遷移先のパネル番号
	 * @param duration 任意のアニメーション時間
	 * @param direction 方向。0 は近いほう
	 */
	gotoPanel(to: number, duration?: number, direction: -1 | 0 | 1 = 0) {
		if (this.isTransition) {
			return;
		}
		this.transitionTo(to, duration, direction);
	}
	/**
	 * 指定した番号のパネル。範囲外は循環する
	 * @param index
	 */
	item(index: number): HTMLElement | undefined {
		return this.panels[wrap(index, this.length)];
	}
	/**
	 * @param duration
	 */
	next(duration?: number) {
		if (this.isTransition) {
			return;
		}
		this.gotoPanel(this.index + 1, duration, 1);
	}
	/**
	 * 遷移終了時に呼ぶ処理を登録する
	 * @param listener
	 */
	onChangeEnd(listener: () => void) {
		this.#changeEndListeners.push(listener);
	}

	/**
	 * 自動再生を開始する。次の遷移を delay 後に予約する
	 */
	play() {
		this.config.auto = true;
		this.isPaused = false;
		if (this.#timer != null) {
			clearTimeout(this.#timer);
		}
		// 1 枚では送る先が無いので回さない
		if (this.length <= 1) {
			return;
		}
		this.#timer = setTimeout(() => this.next(), this.config.delay);
	}

	/**
	 * @param duration
	 */
	prev(duration?: number) {
		if (this.isTransition) {
			return;
		}
		this.gotoPanel(this.index - 1, duration, -1);
	}
	/**
	 * すべての複製を取り除く
	 */
	removeClones() {
		for (const clone of this.clones.splice(0)) {
			clone.remove();
		}
	}
	/**
	 * 複製を含むすべてのパネルから current を外す
	 */
	resetCurrent() {
		for (const el of [...this.panels, ...this.clones]) {
			el.classList.remove(CURRENT_CLASS);
		}
	}
	/**
	 * @param index
	 */
	setCurrent(index: number) {
		this.resetCurrent();
		this.item(index)?.classList.add(CURRENT_CLASS);
	}
	/**
	 * 自動再生を停止する
	 */
	stop() {
		if (this.#timer != null) {
			clearTimeout(this.#timer);
			this.#timer = null;
		}
		this.isPaused = true;
	}

	/**
	 * @param to
	 * @param duration
	 * @param direction
	 * @param vector 移動量を直接指定する（ドラッグ）
	 * @param fromHalfway 中途半端な位置からの遷移かどうか
	 */
	transitionTo(
		to: number,
		duration?: number,
		direction: -1 | 0 | 1 = 0,
		vector?: number,
		fromHalfway = false,
	) {
		this.#before();
		let optimizedVector =
			vector || loopSeriesVector(this.index, to, direction, this.length);
		const distIndex = wrap(this.index + optimizedVector, this.length);
		if (fromHalfway) {
			// 現在の番号と目的の番号が同じなら目的番号差を 0 にする（元の位置へ戻る）
			if (this.index === distIndex) {
				optimizedVector = 0;
			}
		} else if (this.index === distIndex) {
			// 移動しないので、外した current を付け直す
			this.setCurrent(this.index);
			this.#finalize();
			return;
		}
		this.duration = duration || this.config.duration;
		this.vector = optimizedVector;
		this.from = this.index;
		this.to = distIndex;
		this.isTransition = true;
		this.animation = this.#transition.fire(this);
		this.animation.done(() => this.#done());
	}

	#before() {
		this.resetCurrent();
	}
	#clone(count: number) {
		const clones: HTMLElement[] = [];
		for (let i = 0; i < count; i++) {
			for (const panel of this.panels) {
				const clone = panel.cloneNode(true) as HTMLElement;
				// current は原本だけが持つ
				clone.classList.remove(CURRENT_CLASS);
				clones.push(clone);
			}
		}
		this.clones.push(...clones);
		return clones;
	}

	#done() {
		this.index = this.to;
		this.isTransition = false;
		this.#transition.after(this);
		this.#silent();
		for (const listener of this.#changeEndListeners) {
			listener();
		}
		this.#finalize();
	}

	#finalize() {
		if (this.config.auto) {
			this.play();
		} else {
			this.stop();
		}
	}
	#resizeable() {
		const win = this.stage.ownerDocument.defaultView;
		if (!win) {
			return;
		}
		let resizeTimer: ReturnType<typeof setTimeout> | null = null;
		let resizing = false;
		const onResize = () => {
			// 文書から外されたギャラリーの分は何もせず、リスナーごと手放す
			if (!this.stage.isConnected) {
				win.removeEventListener('resize', onResize);
				return;
			}
			if (!resizing) {
				resizing = true;
				this.#transition.reflow(this, 'resizeStart');
				if (this.animation && this.isTransition) {
					this.freeze();
				}
			}
			if (resizeTimer != null) {
				clearTimeout(resizeTimer);
			}
			this.#transition.reflow(this, 'resize');
			resizeTimer = setTimeout(() => {
				this.#transition.reflow(this, 'resizeEnd');
				if (this.isPaused && this.config.auto) {
					this.gotoPanel(this.to);
				}
				resizing = false;
			}, RESIZE_END_DELAY);
		};
		win.addEventListener('resize', onResize);
	}
	#silent() {
		this.#transition.reflow(this, 'transitionEnd');
		this.setCurrent(this.index);
	}

	#whenImagesLoaded() {
		const images = this.panels.flatMap((panel) => [...panel.querySelectorAll('img')]);
		return Promise.all(
			images.map(
				(img) =>
					new Promise<void>((resolve) => {
						if (img.complete) {
							resolve();
							return;
						}
						const done = () => resolve();
						img.addEventListener('load', done, { once: true });
						img.addEventListener('error', done, { once: true });
						img.addEventListener('abort', done, { once: true });
					}),
			),
		);
	}
}

const fade: Transition = {
	init(slider) {
		posBase(slider.container);
		for (const panel of slider.panels) {
			posAbs(panel);
		}
	},
	reflow(slider, timing) {
		switch (timing) {
			case 'transitionEnd':
			case 'resizeStart':
			case 'resizeEnd':
			case 'load': {
				const current = slider.item(slider.to);
				for (const panel of slider.panels) {
					panel.style.zIndex = '0';
					panel.style.opacity = '0';
				}
				if (current) {
					current.style.zIndex = '10';
					current.style.opacity = '1';
				}
				break;
			}
			default:
		}
	},
	fire(slider) {
		const entering = slider.item(slider.to);
		const leaving = slider.item(slider.from);
		slider.animation?.stop();
		if (!entering) {
			return tween(0, () => {});
		}
		entering.style.opacity = '0';
		entering.style.zIndex = '20';
		const animation = animate(entering, slider.duration, (p) => {
			entering.style.opacity = String(p);
		});
		// crossFade: 出るパネルも同時に消す
		if (leaving && leaving !== entering) {
			const start = Number.parseFloat(leaving.style.opacity || '1');
			animate(leaving, slider.duration, (p) => {
				leaving.style.opacity = String(start * (1 - p));
			});
		}
		return animation;
	},
	after(slider) {
		for (const panel of slider.panels) {
			panel.style.opacity = '0';
		}
		const current = slider.item(slider.to);
		if (current) {
			current.style.opacity = '1';
		}
	},
};

const slide: Transition = {
	init(slider) {
		posBase(slider.stage);
		posAbs(slider.container);
		for (const panel of slider.panels) {
			posBase(panel);
			panel.style.float = 'left';
		}
		draggable(slider);
		// 非表示で初期化されたギャラリーは、幅が出た時点で計測し直す
		if (typeof ResizeObserver !== 'undefined') {
			const observer = new ResizeObserver(() => {
				if (slider.panelWidth === 0 && contentWidth(slider.stage) > 0) {
					slide.reflow(slider, 'resizeEnd');
				}
			});
			observer.observe(slider.stage);
		}
	},
	reflow(slider, timing) {
		switch (timing) {
			case 'transitionEnd': {
				slider.container.style.left = `${containerLeft(slider, slider.index)}px`;
				break;
			}
			case 'resizeEnd':
			case 'resizeStart':
			case 'init':
			case 'load': {
				// 幅が無い（非表示）間は計測しない。0 で並べると表示されたときに潰れたままになる
				if (contentWidth(slider.stage) === 0) {
					slider.panelWidth = 0;
					break;
				}
				if (timing === 'resizeEnd') {
					slider.cloneCount = 0;
					slider.removeClones();
				}
				// 幅を直接設定するとインラインの幅しか取れなくなるので、計測の前に初期化時の
				// スタイルへ戻す（相対値の幅を常に元の値から取れるようにする）
				for (const panel of slider.panels) {
					panel.setAttribute('style', '');
					posBase(panel);
					panel.style.float = 'left';
				}
				slider.container.setAttribute('style', '');
				posAbs(slider.container);

				const first = slider.panels[0];
				const panelWidth = first ? contentWidth(first) : 0;
				const panelOuterWidth = first ? outerWidth(first) : 0;
				slider.panelWidth = panelOuterWidth;
				slider.stageWidth = contentWidth(slider.stage);

				for (const panel of [...slider.panels, ...slider.clones]) {
					setContentWidth(panel, panelWidth);
				}

				let containerWidth = panelOuterWidth * slider.length;

				// ステージがコンテナの何倍かで前後に置く複製の組数を決める
				const stageWidthRatio = slider.stageWidth / containerWidth;
				let additionalCloneCount = Math.ceil(stageWidthRatio / 2) + 1;
				// 幅が取れないタイミングでは Infinity になる
				if (additionalCloneCount === Infinity) {
					additionalCloneCount = slider.cloneCount + 1;
				}
				if (slider.cloneCount < additionalCloneCount) {
					slider.removeClones();
					slider.cloneBefore(additionalCloneCount);
					slider.cloneAfter(additionalCloneCount);
					slider.cloneCount = additionalCloneCount;
				}
				containerWidth = slider.panelWidth * slider.length * (slider.cloneCount * 2 + 1);

				slider.container.style.width = `${containerWidth}px`;
				slider.container.style.left = `${containerLeft(slider, slider.index)}px`;
				break;
			}
			default:
		}
	},
	fire(slider) {
		slider.animation?.stop();
		const from = Number.parseFloat(slider.container.style.left) || 0;
		const to = containerLeft(slider, slider.index + slider.vector);
		return animate(slider.container, slider.duration, (p) => {
			slider.container.style.left = `${from + (to - from) * p}px`;
		});
	},
	after() {},
};

/**
 * 複製を含めた並びの中で、index のパネルを先頭に出す container の left
 * @param slider
 * @param index
 */
function containerLeft(slider: Slider, index: number) {
	return (
		slider.panelWidth * index * -1 +
		slider.cloneCount * slider.panelWidth * slider.length * -1
	);
}

/**
 * タッチでのドラッグとスワイプ（slide のみ）
 * @param slider
 */
function draggable(slider: Slider) {
	const BUFFER_DIST_RATIO = 0.25;
	const SWIPE_DETECTION_INTERVAL = 200;
	const SWIPE_DETECTION_PIXEL = 5;
	const stage = slider.stage;
	let dragStartX = 0;
	let dragStartTimestamp = 0;
	let dragStartLeft = 0;
	let moveValue = 0;
	let isSwiping = false;
	let rafId = 0;

	stage.addEventListener(
		'touchstart',
		(e) => {
			const touch = e.touches[0];
			if (!touch) {
				return;
			}
			dragStartX = touch.pageX;
			dragStartTimestamp = Date.now();
			// パネルの動きをその位置で停止する
			slider.freeze();
			dragStartLeft = Number.parseFloat(slider.container.style.left) || 0;
		},
		{ passive: true },
	);

	stage.addEventListener(
		'touchmove',
		(e) => {
			const touch = e.touches[0];
			if (!touch) {
				return;
			}
			const x = touch.pageX - dragStartX;
			const panelX = dragStartLeft + x;
			moveValue = x;
			cancelAnimationFrame(rafId);
			rafId = requestAnimationFrame(() => {
				slider.container.style.left = `${panelX}px`;
			});
		},
		{ passive: true },
	);

	// 遷移を起こさずに指を離したとき（タップ等）、touchstart で止めた自動再生を戻す
	const resume = () => {
		if (slider.config.auto && !slider.isTransition) {
			slider.play();
		}
	};

	const dragEnd = (e: TouchEvent) => {
		const touch = e.touches[0] ?? e.changedTouches[0];
		if (!touch) {
			resume();
			return;
		}
		const x = touch.pageX - dragStartX;
		const pWidth = slider.panelWidth;
		const panelX = dragStartLeft + x;
		const cloneLength = slider.cloneCount * slider.length;
		const cloneWidth = cloneLength * pWidth;
		// インデックス基準の相対位置
		const indexicalPosRatio = (panelX / pWidth) * -1 - cloneLength;
		const ratioX = indexicalPosRatio - slider.index;
		let distIndexicalPosRatio = 0;
		if (ratioX > 0) {
			distIndexicalPosRatio =
				ratioX > BUFFER_DIST_RATIO ? indexicalPosRatio - BUFFER_DIST_RATIO : slider.index;
		} else if (ratioX < 0) {
			distIndexicalPosRatio =
				ratioX < BUFFER_DIST_RATIO * -1
					? indexicalPosRatio - BUFFER_DIST_RATIO
					: slider.index;
		} else {
			resume();
			return;
		}
		// 目的のインデックスまでのパネル数
		const vector = roundUp(distIndexicalPosRatio - slider.index);
		const disPos = vector * pWidth;
		const distance = Math.abs(disPos - cloneWidth - panelX);
		const direction = ((distance === 0 ? 0 : vector > 0 ? 1 : -1) * -1) as -1 | 0 | 1;
		const to = slider.index + vector;

		// スワイプの判定: 短い時間に一定以上動いたら 1 枚送る
		const isSwipeTime = Date.now() - dragStartTimestamp < SWIPE_DETECTION_INTERVAL;
		const isSwipeDest = SWIPE_DETECTION_PIXEL < Math.abs(moveValue);
		if (isSwipeTime && isSwipeDest) {
			isSwiping = true;
			slider.stop();
			const swipeDuration = Date.now() - dragStartTimestamp;
			if (moveValue < 0) {
				slider.next(swipeDuration);
			} else {
				slider.prev(swipeDuration);
			}
		}

		if (!isSwiping && distance !== 0) {
			// 中途半端な位置からの遷移
			slider.transitionTo(to, slider.config.duration, direction, vector, true);
		}
		isSwiping = false;
		resume();
	};
	stage.addEventListener('touchend', dragEnd);
	stage.addEventListener('touchcancel', dragEnd);
}

/**
 * jQuery の swing と同じ曲線
 * @param p
 */
function swing(p: number) {
	return 0.5 - Math.cos(p * Math.PI) / 2;
}

/**
 * 要素ごとに進行中のアニメーション。同じ要素に新しいアニメーションを始めるときは
 * 前のものを止める（jQuery は要素ごとのキューで順番に流すが、ここでは重ねない）
 */
const running = new WeakMap<HTMLElement, Tween>();

/**
 * 要素のアニメーションを始める。その要素で進行中のものは止める
 * @param el
 * @param duration
 * @param apply
 */
function animate(
	el: HTMLElement,
	duration: number,
	apply: (progress: number) => void,
): Tween {
	running.get(el)?.stop();
	const animation = tween(duration, apply);
	running.set(el, animation);
	animation.done(() => {
		if (running.get(el) === animation) {
			running.delete(el);
		}
	});
	return animation;
}

/**
 * requestAnimationFrame で進めるアニメーション。stop() は途中の状態のまま止め、
 * 完了と同じく done の処理を**その場で同期に**呼ぶ。jQuery の `.animate()` が返す
 * コレクションの `.promise()` はキューが空になった時点で解決し、`.stop()` で止めても
 * キューは空になる上、`.done()` の処理は同期に走る。Psycle はそれで遷移後の処理
 * （番号の確定・位置の補正）を走らせていたので、タッチでの停止直後に読む位置が
 * 補正後の値になる
 * @param duration
 * @param apply 0〜1 の進捗（イージング適用後）を受け取る
 */
function tween(duration: number, apply: (progress: number) => void): Tween {
	const callbacks: (() => void)[] = [];
	const start = Date.now();
	let rafId = 0;
	let finished = false;
	const finish = () => {
		if (finished) {
			return;
		}
		finished = true;
		cancelAnimationFrame(rafId);
		for (const callback of callbacks.splice(0)) {
			callback();
		}
	};
	const frame = () => {
		if (finished) {
			return;
		}
		const t = duration > 0 ? Math.min(1, (Date.now() - start) / duration) : 1;
		apply(swing(t));
		if (t >= 1) {
			finish();
		} else {
			rafId = requestAnimationFrame(frame);
		}
	};
	frame();
	return {
		done(callback) {
			if (finished) {
				callback();
				return;
			}
			callbacks.push(callback);
		},
		stop: finish,
	};
}

/**
 * Psycle の Util.getloopSeriesVector。direction が 0 のときは近いほうへ回る
 * @param from
 * @param to
 * @param direction
 * @param length
 */
function loopSeriesVector(
	from: number,
	to: number,
	direction: -1 | 0 | 1,
	length: number,
) {
	if (direction === 0) {
		const f = wrap(from, length);
		const t = wrap(to, length);
		const t2 = f < t ? t - length : t + length;
		const dist = Math.abs(t - f);
		const dist2 = Math.abs(t2 - f);
		if (dist <= dist2) {
			return t < f ? dist * -1 : dist;
		}
		return t2 < f ? dist2 * -1 : dist2;
	}
	if (from === to) {
		return length * direction;
	}
	if (from < to && direction === -1) {
		return wrap(to, length) - length - from;
	}
	if (to < from && direction === 1) {
		return wrap(to, length) + length - from;
	}
	return to - from;
}

/**
 * 0 から遠ざける丸め
 * @param num
 */
function roundUp(num: number) {
	return num > 0 ? Math.ceil(num) : Math.ceil(num * -1) * -1;
}

/**
 * @param el
 */
function posAbs(el: HTMLElement) {
	el.style.position = 'absolute';
	el.style.top = '0px';
	el.style.left = '0px';
}

/**
 * position が未指定か static なら relative にする
 * @param el
 */
function posBase(el: HTMLElement) {
	const position = getComputedStyle(el).position;
	if (!position || position === 'static') {
		el.style.position = 'relative';
	}
}

/**
 * padding と border を除いた幅（jQuery の width()）
 * @param el
 */
function contentWidth(el: HTMLElement) {
	const style = getComputedStyle(el);
	return (
		el.getBoundingClientRect().width -
		px(style.paddingLeft) -
		px(style.paddingRight) -
		px(style.borderLeftWidth) -
		px(style.borderRightWidth)
	);
}

/**
 * margin を含めた幅（jQuery の outerWidth(true)）
 * @param el
 */
function outerWidth(el: HTMLElement) {
	const style = getComputedStyle(el);
	return el.getBoundingClientRect().width + px(style.marginLeft) + px(style.marginRight);
}

/**
 * 内容の幅が width になるように style.width を設定する（jQuery の width(value)）
 * @param el
 * @param width
 */
function setContentWidth(el: HTMLElement, width: number) {
	const style = getComputedStyle(el);
	const extra =
		style.boxSizing === 'border-box'
			? px(style.paddingLeft) +
				px(style.paddingRight) +
				px(style.borderLeftWidth) +
				px(style.borderRightWidth)
			: 0;
	el.style.width = `${width + extra}px`;
}
