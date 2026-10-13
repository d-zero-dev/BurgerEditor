import { test, expect, describe, vi } from 'vitest';

import { openDom } from './disposable-dom.js';

describe('openDom', () => {
	test('渡したHTMLをパースしたwindowを返す', () => {
		using scope = openDom('<p id="a">hello</p>');

		expect(scope.window.document.getElementById('a')?.textContent).toBe('hello');
		expect(scope.dom.window).toBe(scope.window);
	});

	test('dispose時にjsdomのwindowを閉じる', () => {
		const scope = openDom('<p></p>');
		const close = vi.spyOn(scope.window, 'close');

		scope[Symbol.dispose]();

		expect(close).toHaveBeenCalledOnce();
	});

	test('usingブロックを抜けるとwindowが閉じられる', () => {
		let close!: ReturnType<typeof vi.spyOn>;
		{
			using scope = openDom('<p></p>');
			close = vi.spyOn(scope.window, 'close');
			expect(close).not.toHaveBeenCalled();
		}

		expect(close).toHaveBeenCalledOnce();
	});

	test('例外で抜けてもwindowが閉じられる', () => {
		let close!: ReturnType<typeof vi.spyOn>;

		expect(() => {
			using scope = openDom('<p></p>');
			close = vi.spyOn(scope.window, 'close');
			throw new Error('boom');
		}).toThrow('boom');

		expect(close).toHaveBeenCalledOnce();
	});
});
