import { describe, expect, onTestFinished, test } from 'vitest';

import { injectCSS, renderDialog, renderElement } from './vr-helper.js';

// onTestFinishedのハンドラは登録と逆順に走るため、ヘルパー呼び出しより
// 先に登録した検証は、ヘルパーの後片付けが済んだ後に実行される
describe('vr-helper', () => {
	test('テスト終了時にヘルパーが追加した要素だけが取り除かれる', () => {
		const foreignStyle = document.createElement('style');
		document.head.append(foreignStyle);
		const foreignElement = document.createElement('div');
		document.body.append(foreignElement);
		// 最初に登録して最後に走らせ、下の検証が失敗しても必ず片付ける
		onTestFinished(() => {
			foreignStyle.remove();
			foreignElement.remove();
		});

		const added: Element[] = [];
		onTestFinished(() => {
			expect(added.map((el) => el.isConnected)).toEqual([false, false, false, false]);
			expect(foreignStyle.isConnected).toBe(true);
			expect(foreignElement.isConnected).toBe(true);
		});

		const stylesBefore = new Set(document.head.querySelectorAll('style'));
		injectCSS();
		const injected = [...document.head.querySelectorAll('style')].filter(
			(style) => !stylesBefore.has(style),
		);
		const dialog = renderDialog('<p>dialog</p>');
		const container = renderElement('<p>element</p>');
		added.push(...injected, dialog, container);

		expect(added.map((el) => el.isConnected)).toEqual([true, true, true, true]);
		expect(dialog.open).toBe(true);
	});
});
