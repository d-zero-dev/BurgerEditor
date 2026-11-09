import { afterEach, beforeEach, expect, onTestFinished, test } from 'vitest';
import { commands } from 'vitest/browser';

import { BLOCK_SWAP_VIEW_TRANSITION_CSS } from './block-swap-view-transition-css.js';
import { replaceElement } from './replace-element.js';

let injectedStyle: HTMLStyleElement | null = null;

beforeEach(() => {
	document.body.replaceChildren();
	for (const el of document.head.querySelectorAll('[data-bge-test-view-transition]'))
		el.remove();
	injectedStyle = document.createElement('style');
	injectedStyle.dataset.bgeTestViewTransition = '';
	injectedStyle.textContent = BLOCK_SWAP_VIEW_TRANSITION_CSS;
	document.head.append(injectedStyle);
});

afterEach(() => {
	injectedStyle?.remove();
	injectedStyle = null;
});

/**
 * @returns Parent with two child divs (#a, #b).
 */
function mountAdjacentBlocks(): {
	parent: HTMLDivElement;
	elA: HTMLDivElement;
	elB: HTMLDivElement;
} {
	const parent = document.createElement('div');
	const elA = document.createElement('div');
	elA.id = 'a';
	const elB = document.createElement('div');
	elB.id = 'b';
	parent.append(elA, elB);
	document.body.append(parent);
	return { parent, elA, elB };
}

test('隣接する2要素の DOM 順序を入れ替える', async () => {
	const { parent, elA, elB } = mountAdjacentBlocks();

	await replaceElement(elA, elB);

	expect([...parent.children].map((el) => el.id)).toEqual(['b', 'a']);
});

test('prefers-reduced-motion: reduce では View Transition がすぐ終わる', async () => {
	await commands.emulateMedia({ reducedMotion: 'reduce' });
	onTestFinished(async () => {
		await commands.emulateMedia({ reducedMotion: null });
	});

	const { elA, elB } = mountAdjacentBlocks();
	const started = performance.now();
	await replaceElement(elA, elB);
	const elapsed = performance.now() - started;

	// Issue #1106 の手動計測（reduce 時 ~34ms）に余裕を持たせた上限
	expect(elapsed).toBeLessThan(200);
});
