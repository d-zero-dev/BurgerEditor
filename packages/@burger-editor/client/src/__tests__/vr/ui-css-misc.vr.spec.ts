import { beforeEach, describe, expect, test } from 'vitest';
import { commands, page } from 'vitest/browser';

import { injectCSS, renderDialog, renderElement, waitForRender } from './vr-helper.js';

const TABLER_ICON_SVG = `<svg class="tabler-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 5h6a3.5 3.5 0 0 1 0 7H7z"/><path d="M13 12h1a3.5 3.5 0 0 1 0 7H7v-7"/></svg>`;

describe('Misc UI', () => {
	beforeEach(() => {
		injectCSS();
	});

	test('editable-area visual mode', async () => {
		const html = `<div data-bge-component="xxx-editable-area" data-bge-component-mode="visual" style="background: #f5f5f5; padding: 8px; border: 1px solid #ccc;">
			<iframe src="about:blank" style="width: 300px; height: 200px; background: #fff;"></iframe>
			<textarea style="width: 300px; height: 200px;">source code</textarea>
		</div>`;
		const container = renderElement(html);
		await waitForRender();
		const area = container.querySelector('[data-bge-component]') as HTMLElement;
		const base64 = await page.screenshot({ element: area, save: false });
		const result = await commands.matchScreenshot(
			base64,
			'__snapshots__/misc/editable-area-visual.png',
		);
		expect(result.pass, result.message).toBe(true);
	});

	test('editable-area source mode', async () => {
		const html = `<div data-bge-component="xxx-editable-area" data-bge-component-mode="source">
			<iframe src="about:blank" style="width: 300px; height: 200px;"></iframe>
			<textarea style="width: 300px; height: 200px;">source code</textarea>
		</div>`;
		const container = renderElement(html);
		await waitForRender();
		const area = container.querySelector('[data-bge-component]') as HTMLElement;
		const base64 = await page.screenshot({ element: area, save: false });
		const result = await commands.matchScreenshot(
			base64,
			'__snapshots__/misc/editable-area-source.png',
		);
		expect(result.pass, result.message).toBe(true);
	});

	test('tabs + adjacent content', async () => {
		const html = `<div>
			<div data-bge-editor-ui="tabs" data-bge-editor-ui-for="vr-tabs-content">
				<button type="button" role="tab" aria-selected="true">画像1</button>
				<button type="button" role="tab">画像2</button>
			</div>
			<div id="vr-tabs-content" role="tabpanel" aria-label="画像">
				<p>タブパネルの内容</p>
			</div>
		</div>`;
		const dialog = renderDialog(html);
		await waitForRender();
		const base64 = await page.screenshot({ element: dialog, save: false });
		const result = await commands.matchScreenshot(
			base64,
			'__snapshots__/misc/tabs-adjacent-content.png',
		);
		expect(result.pass, result.message).toBe(true);
	});

	test('iframe (YouTube preview)', async () => {
		const html = `<div>
			<iframe title="YouTubeプレビュー" loading="lazy" style="aspect-ratio: 16 / 9"></iframe>
			<label><span>URLもしくは動画ID</span><input type="text" name="bge-id" /></label>
		</div>`;
		const dialog = renderDialog(html);
		await waitForRender();
		const base64 = await page.screenshot({ element: dialog, save: false });
		const result = await commands.matchScreenshot(
			base64,
			'__snapshots__/misc/iframe-youtube.png',
		);
		expect(result.pass, result.message).toBe(true);
	});

	test('focus-visible state', async () => {
		const html = `<div>
			<label><span>テスト入力</span><input type="text" name="test-input" /></label>
		</div>`;
		const dialog = renderDialog(html);
		await waitForRender();
		const input = dialog.querySelector('input') as HTMLInputElement;
		input.focus();
		await waitForRender();
		const base64 = await page.screenshot({ element: dialog, save: false });
		const result = await commands.matchScreenshot(
			base64,
			'__snapshots__/misc/focus-visible.png',
		);
		expect(result.pass, result.message).toBe(true);
	});

	test('code element', async () => {
		const html = `<div>
			<p>クラス名は <code>bge-custom-class</code> を使用してください。</p>
		</div>`;
		const dialog = renderDialog(html);
		await waitForRender();
		const base64 = await page.screenshot({ element: dialog, save: false });
		const result = await commands.matchScreenshot(
			base64,
			'__snapshots__/misc/code-element.png',
		);
		expect(result.pass, result.message).toBe(true);
	});

	test('tabler-icon sizing', async () => {
		const html = `<button type="button">${TABLER_ICON_SVG} ボタン</button>`;
		const dialog = renderDialog(html);
		await waitForRender();
		const btn = dialog.querySelector('form button') as HTMLElement;
		const base64 = await page.screenshot({ element: btn, save: false });
		const result = await commands.matchScreenshot(
			base64,
			'__snapshots__/misc/tabler-icon-sizing.png',
		);
		expect(result.pass, result.message).toBe(true);
	});

	test('carousel slide list (thumbnail / name / actions in a row, long name is truncated)', async () => {
		// サムネイルは CSS モジュールの部品（ThumbnailButton）なので、ここでは同じ大きさの
		// ボタンで置き換える。確認するのは ui.css の slide-list の並びと名前の省略
		const row = (name: string, actions: string) => `<li>
			<button type="button" style="flex: none; inline-size: 8em; aspect-ratio: 4 / 3">編集</button>
			<span data-bge-slide-name="">${name}</span>
			<span data-bge-slide-actions="">${actions}</span>
		</li>`;
		const html = `<ol data-bge-editor-ui-component="slide-list">
			${row('スライド1', '<button type="button" disabled>前へ</button><button type="button">後ろへ</button><button type="button" disabled>削除</button>')}
			${row('2. 夕焼けの海岸線に沈んでいく太陽と、その手前を横切る小さな漁船の群れ、遠くに霞む島影', '<button type="button">前へ</button><button type="button">後ろへ</button><button type="button">削除</button>')}
		</ol>`;
		const dialog = renderDialog(html);
		await waitForRender();
		const base64 = await page.screenshot({ element: dialog, save: false });
		const result = await commands.matchScreenshot(
			base64,
			'__snapshots__/misc/carousel-slide-list.png',
		);
		expect(result.pass, result.message).toBe(true);
	});
});
