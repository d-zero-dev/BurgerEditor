import { test, expect, beforeEach, afterEach, vi } from 'vitest';

import { animateInsertion } from './animate-insertion.js';

// jsdomはWeb Animations API未実装（Element.prototype.animateが無い）。
// core側で実ブラウザテストしていた挙動（reduced-motionでのduration分岐、
// キャンセル時もresolveすること）を検証するため、finishedを外部から
// 操作できる最小のAnimationスタブを差し込む
class FakeAnimation {
	finished: Promise<void>;
	#reject!: (reason?: unknown) => void;
	#resolve!: () => void;

	constructor() {
		this.finished = new Promise<void>((resolve, reject) => {
			this.#resolve = resolve;
			this.#reject = reject;
		});
	}

	cancel() {
		this.#reject(new Error('canceled'));
	}

	finish() {
		this.#resolve();
	}
}

let lastAnimation: FakeAnimation | null = null;
let lastAnimateArgs: [Keyframe[], KeyframeAnimationOptions] | null = null;

beforeEach(() => {
	lastAnimation = null;
	lastAnimateArgs = null;
	Element.prototype.animate = function (
		keyframes: Keyframe[],
		options: KeyframeAnimationOptions,
	) {
		lastAnimateArgs = [keyframes, options];
		lastAnimation = new FakeAnimation();
		return lastAnimation as unknown as Animation;
	};
});

afterEach(() => {
	vi.unstubAllGlobals(); // cspell:disable-line
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	delete (Element.prototype as any).animate;
});

test('通常時はprefers-reduced-motionを考慮した既定durationでアニメーションしfinished解決後にresolveする', async () => {
	vi.stubGlobal('matchMedia', () => ({ matches: false }));
	const marker = document.createElement('div');
	vi.spyOn(marker, 'getBoundingClientRect').mockReturnValue({ height: 120 } as DOMRect);

	const promise = animateInsertion(marker);

	expect(lastAnimateArgs?.[1].duration).toBe(400);
	expect(lastAnimateArgs?.[0]).toEqual([{ height: '0px' }, { height: '120px' }]);
	expect(marker.style.height).toBe('auto');
	expect(marker.style.overflow).toBe('hidden');

	lastAnimation?.finish();
	await expect(promise).resolves.toBeUndefined();
});

test('prefers-reduced-motion時はduration 0でアニメーションする（regression: PR #834）', async () => {
	vi.stubGlobal('matchMedia', () => ({ matches: true }));
	const marker = document.createElement('div');
	vi.spyOn(marker, 'getBoundingClientRect').mockReturnValue({ height: 50 } as DOMRect);

	const promise = animateInsertion(marker);

	expect(lastAnimateArgs?.[1].duration).toBe(0);

	lastAnimation?.finish();
	await expect(promise).resolves.toBeUndefined();
});

test('アニメーションがキャンセルされてもresolveする（finishedのreject経路も完了扱いにする）', async () => {
	vi.stubGlobal('matchMedia', () => ({ matches: false }));
	const marker = document.createElement('div');
	vi.spyOn(marker, 'getBoundingClientRect').mockReturnValue({ height: 80 } as DOMRect);

	const promise = animateInsertion(marker);
	lastAnimation?.cancel();

	await expect(promise).resolves.toBeUndefined();
});

test('matchMediaが存在しない環境でも既定durationで動作する', async () => {
	// リテラルのundefinedはlintのuseless-undefined系オートフィックスで
	// 引数ごと消えるため、変数経由でmatchMedia自体を未定義化する
	const noMatchMedia: typeof window.matchMedia | undefined = undefined;
	vi.stubGlobal('matchMedia', noMatchMedia);
	const marker = document.createElement('div');
	vi.spyOn(marker, 'getBoundingClientRect').mockReturnValue({ height: 10 } as DOMRect);

	const promise = animateInsertion(marker);

	expect(lastAnimateArgs?.[1].duration).toBe(400);

	lastAnimation?.finish();
	await expect(promise).resolves.toBeUndefined();
});
