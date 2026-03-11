import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { commands, page } from 'vitest/browser';

import { cleanUp, injectCSS, renderDialog, waitForRender } from './vr-helper.js';

const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M7 5h6a3.5 3.5 0 0 1 0 7H7z"/><path d="M13 12h1a3.5 3.5 0 0 1 0 7H7v-7"/></svg>`;

const TOOLBAR_HTML = `<bge-wysiwyg-editor>
	<div data-bge-toolbar>
		<div data-bge-toolbar-group>
			<button type="button" data-bge-toolbar-button="bold" aria-label="太字">${ICON_SVG}</button>
			<button type="button" data-bge-toolbar-button="italic" aria-label="斜体">${ICON_SVG}</button>
			<button type="button" data-bge-toolbar-button="underline" aria-label="下線">${ICON_SVG}</button>
			<button type="button" data-bge-toolbar-button="strikethrough" aria-label="取消線">${ICON_SVG}</button>
		</div>
		<div data-bge-toolbar-group>
			<button type="button" data-bge-toolbar-button="link" aria-label="リンク">${ICON_SVG}</button>
			<button type="button" data-bge-toolbar-button="blockquote" aria-label="引用">${ICON_SVG}</button>
			<button type="button" data-bge-toolbar-button="bullet-list" aria-label="箇条書き">${ICON_SVG}</button>
			<button type="button" data-bge-toolbar-button="ordered-list" aria-label="番号付きリスト">${ICON_SVG}</button>
		</div>
	</div>
	<fieldset>
		<div contenteditable="true" style="min-height: 100px;">テスト テキスト</div>
	</fieldset>
</bge-wysiwyg-editor>`;

describe('Toolbar + Buttons', () => {
	beforeEach(() => {
		injectCSS();
	});

	afterEach(() => {
		cleanUp();
	});

	test('WYSIWYG toolbar whole', async () => {
		const dialog = renderDialog(TOOLBAR_HTML);
		await waitForRender();
		const toolbar = dialog.querySelector('[data-bge-toolbar]') as HTMLElement;
		const base64 = await page.screenshot({ element: toolbar, save: false });
		const result = await commands.matchScreenshot(
			base64,
			'__snapshots__/toolbar-buttons/wysiwyg-toolbar.png',
		);
		expect(result.pass, result.message).toBe(true);
	});

	test('toolbar-button normal', async () => {
		const dialog = renderDialog(TOOLBAR_HTML);
		await waitForRender();
		const btn = dialog.querySelector('[data-bge-toolbar-button]') as HTMLElement;
		const base64 = await page.screenshot({ element: btn, save: false });
		const result = await commands.matchScreenshot(
			base64,
			'__snapshots__/toolbar-buttons/toolbar-button-normal.png',
		);
		expect(result.pass, result.message).toBe(true);
	});

	test('toolbar-button pressed', async () => {
		const dialog = renderDialog(TOOLBAR_HTML);
		await waitForRender();
		const btn = dialog.querySelector('[data-bge-toolbar-button]') as HTMLElement;
		btn.setAttribute('aria-pressed', 'true');
		await waitForRender();
		const base64 = await page.screenshot({ element: btn, save: false });
		const result = await commands.matchScreenshot(
			base64,
			'__snapshots__/toolbar-buttons/toolbar-button-pressed.png',
		);
		expect(result.pass, result.message).toBe(true);
	});

	test('toolbar-button disabled', async () => {
		const dialog = renderDialog(TOOLBAR_HTML);
		await waitForRender();
		const btn = dialog.querySelector('[data-bge-toolbar-button]') as HTMLButtonElement;
		btn.disabled = true;
		await waitForRender();
		const base64 = await page.screenshot({ element: btn, save: false });
		const result = await commands.matchScreenshot(
			base64,
			'__snapshots__/toolbar-buttons/toolbar-button-disabled.png',
		);
		expect(result.pass, result.message).toBe(true);
	});

	test('button normal', async () => {
		const html = `<div>
			<label><span>住所から検索</span><input type="search" /></label>
			<button type="button">検索</button>
		</div>`;
		const dialog = renderDialog(html);
		await waitForRender();
		const btn = dialog.querySelector('button:not(footer button)') as HTMLElement;
		const base64 = await page.screenshot({ element: btn, save: false });
		const result = await commands.matchScreenshot(
			base64,
			'__snapshots__/toolbar-buttons/button-normal.png',
		);
		expect(result.pass, result.message).toBe(true);
	});

	test('button pressed/selected', async () => {
		const html = `<button type="button" aria-pressed="true">選択済み</button>`;
		const dialog = renderDialog(html);
		await waitForRender();
		const btn = dialog.querySelector('form button') as HTMLElement;
		const base64 = await page.screenshot({ element: btn, save: false });
		const result = await commands.matchScreenshot(
			base64,
			'__snapshots__/toolbar-buttons/button-pressed.png',
		);
		expect(result.pass, result.message).toBe(true);
	});
});
