import { test, expect, beforeEach } from 'vitest';

import { TextOnlyModeController } from './text-only-mode.js';

/**
 * activate()に必要な最小限のshadowRootを組み立てる
 */
function createShadowRoot() {
	const host = document.createElement('div');
	document.body.append(host);
	const shadowRoot = host.attachShadow({ mode: 'open' });
	shadowRoot.innerHTML = `<div data-bge-mode="wysiwyg"></div>`;
	return shadowRoot;
}

beforeEach(() => {
	document.body.innerHTML = '';
});

test('deactivate()はコンテナのinnerHTMLを空にするが、コンテナ要素自体はDOMに残す', () => {
	const shadowRoot = createShadowRoot();
	const controller = new TextOnlyModeController(() => {});

	controller.activate(shadowRoot, '<p>hello</p>', null, null);
	expect(controller.container).not.toBeNull();

	controller.deactivate();

	expect(controller.container).not.toBeNull();
	expect(controller.container?.innerHTML).toBe('');
	expect(controller.container?.isConnected).toBe(true);
});

test('[Symbol.dispose]()はdeactivate()に加えてコンテナ要素自体をDOMから除去する', () => {
	const shadowRoot = createShadowRoot();
	const controller = new TextOnlyModeController(() => {});

	controller.activate(shadowRoot, '<p>hello</p>', null, null);
	const container = controller.container;
	expect(container?.isConnected).toBe(true);

	controller[Symbol.dispose]();

	expect(controller.container).toBeNull();
	expect(container?.isConnected).toBe(false);
});

test('[Symbol.dispose]()はactivate()を呼んでいなくても安全（冪等）', () => {
	const controller = new TextOnlyModeController(() => {});

	expect(() => {
		controller[Symbol.dispose]();
	}).not.toThrow();
});
