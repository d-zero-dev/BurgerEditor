import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { commands, page } from 'vitest/browser';

import { hrHtml, youtubeHtml } from './fixtures.js';
import { cleanUp, injectCSS, renderDialog, waitForRender } from './vr-helper.js';

describe('Form Controls', () => {
	beforeEach(() => {
		injectCSS();
	});

	afterEach(() => {
		cleanUp();
	});

	test('label + text input', async () => {
		const html = extractFragment(youtubeHtml, 'div:nth-of-type(2)');
		const dialog = renderDialog(html);
		await waitForRender();
		const base64 = await page.screenshot({ element: dialog, save: false });
		const result = await commands.matchScreenshot(
			base64,
			'__snapshots__/form-controls/label-text-input.png',
		);
		expect(result.pass, result.message).toBe(true);
	});

	test('select custom arrow', async () => {
		renderDialog(hrHtml);
		await waitForRender();
		const select = document.querySelector('select') as HTMLSelectElement;
		const base64 = await page.screenshot({ element: select, save: false });
		const result = await commands.matchScreenshot(
			base64,
			'__snapshots__/form-controls/select-custom-arrow.png',
		);
		expect(result.pass, result.message).toBe(true);
	});

	test('checkbox + span', async () => {
		const html = `<label><input type="checkbox"><span>開いた状態で公開する</span></label>`;
		const dialog = renderDialog(`<div>${html}</div>`);
		await waitForRender();
		const base64 = await page.screenshot({ element: dialog, save: false });
		const result = await commands.matchScreenshot(
			base64,
			'__snapshots__/form-controls/checkbox-span.png',
		);
		expect(result.pass, result.message).toBe(true);
	});

	test('search input + button', async () => {
		const html = `<div>
			<label><span>住所から検索</span><input type="search" name="bge-search" /></label>
			<button type="button">検索</button>
		</div>`;
		const dialog = renderDialog(html);
		await waitForRender();
		const base64 = await page.screenshot({ element: dialog, save: false });
		const result = await commands.matchScreenshot(
			base64,
			'__snapshots__/form-controls/search-input-button.png',
		);
		expect(result.pass, result.message).toBe(true);
	});

	test('output element', async () => {
		const html = `<div>
			<label><span>緯度</span><output>35.6762</output></label>
			<label><span>経度</span><output>139.6503</output></label>
		</div>`;
		const dialog = renderDialog(html);
		await waitForRender();
		const base64 = await page.screenshot({ element: dialog, save: false });
		const result = await commands.matchScreenshot(
			base64,
			'__snapshots__/form-controls/output-element.png',
		);
		expect(result.pass, result.message).toBe(true);
	});

	test('number + range + output', async () => {
		const html = `<div>
			<span>
				<label for="vr-range-number">幅</label>
				<input type="number" id="vr-range-number" name="bge-css-width-number" min="1" step="1" value="100" />
				<output>px</output>
			</span>
			<input aria-label="幅" type="range" name="bge-scale" min="1" max="100" step="1" value="100" />
		</div>`;
		const dialog = renderDialog(html);
		await waitForRender();
		const base64 = await page.screenshot({ element: dialog, save: false });
		const result = await commands.matchScreenshot(
			base64,
			'__snapshots__/form-controls/number-range-output.png',
		);
		expect(result.pass, result.message).toBe(true);
	});

	test('checkbox with aria-describedby + small', async () => {
		const html = `<div>
			<label><input type="checkbox" checked aria-describedby="vr-desc" />遅延読み込み</label>
			<small id="vr-desc">画像がブラウザの表示エリアに現れるまでファイルを読み込みません。</small>
		</div>`;
		const dialog = renderDialog(html);
		await waitForRender();
		const base64 = await page.screenshot({ element: dialog, save: false });
		const result = await commands.matchScreenshot(
			base64,
			'__snapshots__/form-controls/checkbox-aria-describedby.png',
		);
		expect(result.pass, result.message).toBe(true);
	});
});

/**
 *
 * @param html
 * @param _selector
 */
function extractFragment(html: string, _selector: string): string {
	const temp = document.createElement('div');
	temp.innerHTML = html;
	const el = temp.querySelector(_selector);
	return el ? el.outerHTML : html;
}
