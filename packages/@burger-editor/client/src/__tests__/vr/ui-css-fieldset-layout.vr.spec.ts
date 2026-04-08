import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { commands, page } from 'vitest/browser';

import { buttonHtml } from './fixtures.js';
import { cleanUp, injectCSS, renderDialog, waitForRender } from './vr-helper.js';

describe('Fieldset + Radiogroup Layout', () => {
	beforeEach(() => {
		injectCSS();
	});

	afterEach(() => {
		cleanUp();
	});

	test('fieldset — link settings', async () => {
		const html = `<fieldset>
			<legend>リンク</legend>
			<label><span>URL</span><input type="text" name="bge-link" /></label>
			<label><span>ターゲット</span>
				<select name="bge-target">
					<option value="">指定なし</option>
					<option value="_blank">新しいウィンドウ(_blank)</option>
					<option value="_top">最上部ウィンドウ(_top)</option>
					<option value="_self">同じウィンドウ(_self)</option>
				</select>
			</label>
		</fieldset>`;
		const dialog = renderDialog(html);
		await waitForRender();
		const fieldset = dialog.querySelector('fieldset') as HTMLFieldSetElement;
		const base64 = await page.screenshot({ element: fieldset, save: false });
		const result = await commands.matchScreenshot(
			base64,
			'__snapshots__/fieldset-layout/fieldset-link.png',
		);
		expect(result.pass, result.message).toBe(true);
	});

	test('fieldset — icon settings', async () => {
		const html = `<fieldset>
			<legend>アイコン</legend>
			<label><span>前</span>
				<select name="bge-before-icon">
					<option value="">なし</option>
					<option value="arrow-right">矢印</option>
				</select>
			</label>
			<label><span>後</span>
				<select name="bge-after-icon">
					<option value="">なし</option>
					<option value="arrow-right">矢印</option>
				</select>
			</label>
		</fieldset>`;
		const dialog = renderDialog(html);
		await waitForRender();
		const fieldset = dialog.querySelector('fieldset') as HTMLFieldSetElement;
		const base64 = await page.screenshot({ element: fieldset, save: false });
		const result = await commands.matchScreenshot(
			base64,
			'__snapshots__/fieldset-layout/fieldset-icon.png',
		);
		expect(result.pass, result.message).toBe(true);
	});

	test('radiogroup — base selection', async () => {
		const html = `<div role="radiogroup" aria-labelledby="vr-radio-group1">
			<div id="vr-radio-group1">基準</div>
			<label><input type="radio" name="bge-scale-type" value="container" /><span>コンテナ</span></label>
			<label><input type="radio" name="bge-scale-type" value="original" checked />画像基準</label>
		</div>`;
		const dialog = renderDialog(html);
		await waitForRender();
		const base64 = await page.screenshot({ element: dialog, save: false });
		const result = await commands.matchScreenshot(
			base64,
			'__snapshots__/fieldset-layout/radiogroup-base.png',
		);
		expect(result.pass, result.message).toBe(true);
	});

	test('radiogroup — aspect ratio', async () => {
		const html = `<div role="radiogroup" aria-labelledby="vr-radio-group2">
			<div id="vr-radio-group2">縦横比</div>
			<label><input type="radio" name="bge-aspect-ratio" value="revert" checked />オリジナル</label>
			<label><input type="radio" name="bge-aspect-ratio" value="1/1" />1 : 1</label>
			<label><input type="radio" name="bge-aspect-ratio" value="4/3" />4 : 3</label>
			<label><input type="radio" name="bge-aspect-ratio" value="16/9" />16 : 9</label>
		</div>`;
		const dialog = renderDialog(html);
		await waitForRender();
		const base64 = await page.screenshot({ element: dialog, save: false });
		const result = await commands.matchScreenshot(
			base64,
			'__snapshots__/fieldset-layout/radiogroup-aspect-ratio.png',
		);
		expect(result.pass, result.message).toBe(true);
	});

	test('consecutive label separator', async () => {
		const dialog = renderDialog(buttonHtml);
		await waitForRender();
		const base64 = await page.screenshot({ element: dialog, save: false });
		const result = await commands.matchScreenshot(
			base64,
			'__snapshots__/fieldset-layout/label-separator.png',
		);
		expect(result.pass, result.message).toBe(true);
	});

	test('fieldset with label + checkbox mix', async () => {
		const html = `<fieldset>
			<legend>リンク</legend>
			<label><input type="checkbox" name="bge-popup" />ポップアップで画像を開く</label>
			<label><span>リンク先URL</span><input type="url" name="bge-href" /></label>
			<label><input type="checkbox" name="bge-target-blank" />別タブで開く</label>
		</fieldset>`;
		const dialog = renderDialog(html);
		await waitForRender();
		const fieldset = dialog.querySelector('fieldset') as HTMLFieldSetElement;
		const base64 = await page.screenshot({ element: fieldset, save: false });
		const result = await commands.matchScreenshot(
			base64,
			'__snapshots__/fieldset-layout/fieldset-checkbox-mix.png',
		);
		expect(result.pass, result.message).toBe(true);
	});
});
