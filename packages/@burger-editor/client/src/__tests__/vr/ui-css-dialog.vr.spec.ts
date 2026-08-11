import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { commands, page } from 'vitest/browser';

import { cleanUp, injectCSS, renderDialog, waitForRender } from './vr-helper.js';

// 各アイテムのエディタ（React版）が描画するマークアップと同等のフィクスチャ

const hrHtml = `<div>
	<label><span>区切り線の種類</span>
		<select name="bge-kind">
			<option value="primary">標準</option>
			<option value="dashed">破線</option>
			<option value="bold">太い区切り線</option>
			<option value="narrow">細い区切り線</option>
		</select>
	</label>
</div>`;

const buttonHtml = `<div>
	<fieldset>
		<legend>リンク</legend>
		<label><span>URL</span><input type="text" name="bge-link" /></label>
		<label><span>ターゲット</span>
			<select name="bge-target">
				<option value="">指定なし</option>
				<option value="_blank">新しいウィンドウ(_blank)</option>
			</select>
		</label>
	</fieldset>
	<label><span>テキスト</span><input type="text" name="bge-text" /></label>
	<label><span>サブテキスト</span><input type="text" name="bge-subtext" /></label>
	<label><span>ボタンのスタイル</span>
		<select name="bge-kind"><option value="primary">プライマリボタン</option></select>
	</label>
	<fieldset>
		<legend>アイコン</legend>
		<label><span>前</span><select name="bge-before-icon"><option value="none">なし</option></select></label>
		<label><span>後</span><select name="bge-after-icon"><option value="none">なし</option></select></label>
	</fieldset>
</div>`;

const imageHtml = `<div data-bge-dialog="2col">
	<div data-bge-dialog-ui="sticky">
		<div>
			<div role="tablist">
				<button type="button" role="tab" aria-selected="true" tabindex="0">画像1</button>
				<button type="button" role="tab" aria-selected="false" tabindex="-1">画像2</button>
			</div>
			<div role="tabpanel" aria-label="画像">
				<div><div class="img"><p>プレビューできません</p></div></div>
				<div>
					<label><span>メディアクエリー</span><input type="text" name="bge-media-input" disabled /></label>
				</div>
			</div>
		</div>
		<div>
			<fieldset id="bge-image-size-fieldset">
				<legend>画像のサイズ</legend>
				<div role="radiogroup"><div>基準</div>
					<label><input type="radio" name="bge-scale-type" value="container" />基準</label>
					<label><input type="radio" name="bge-scale-type" value="original" checked />画像基準</label>
				</div>
			</fieldset>
			<label><span>画像の代替テキスト(alt)</span><input type="text" name="bge-alt-editable" /></label>
			<label><span>キャプション</span><input type="text" name="bge-caption" /></label>
		</div>
	</div>
	<div>
		<div><button type="button">ファイルを追加アップロードする</button></div>
		<ul></ul>
	</div>
</div>`;

const downloadFileHtml = `<div data-bge-dialog="2col">
	<div data-bge-dialog-ui="sticky">
		<div>
			<div><div class="img"><p>プレビューできません</p></div></div>
		</div>
		<div>
			<label><span>表示ファイル名</span><input type="text" name="bge-name" /></label>
			<label><input type="checkbox" name="bge-download-check" />ブラウザで開かずに直接ダウンロードさせる</label>
		</div>
	</div>
	<div>
		<div><button type="button">ファイルを追加アップロードする</button></div>
		<ul></ul>
	</div>
</div>`;

const tableHtml = `<div data-bge-dialog="wide">
	<div>
		<label><input type="checkbox" name="bge-scrollable" /><span>横スクロール可能</span></label>
	</div>
	<div>
		<label><span>表見出し</span><input type="text" name="bge-caption" /></label>
	</div>
	<div>
		<div>
			<div><textarea aria-label="0行目の見出しセル" name="bge-th-0"></textarea></div>
			<div><textarea aria-label="0行目の内容セル" name="bge-td-0"></textarea></div>
			<div><ul><li><button type="button" title="下に追加">+</button></li></ul></div>
		</div>
	</div>
</div>`;

describe('Dialog Layout', () => {
	beforeEach(() => {
		injectCSS();
	});

	afterEach(() => {
		cleanUp();
	});

	test('dialog normal — hr (select)', async () => {
		const dialog = renderDialog(hrHtml);
		await waitForRender();
		const base64 = await page.screenshot({ element: dialog, save: false });
		const result = await commands.matchScreenshot(
			base64,
			'__snapshots__/dialog/normal-hr.png',
		);
		expect(result.pass, result.message).toBe(true);
	});

	test('dialog normal — button (fieldset×2)', async () => {
		const dialog = renderDialog(buttonHtml);
		await waitForRender();
		const base64 = await page.screenshot({ element: dialog, save: false });
		const result = await commands.matchScreenshot(
			base64,
			'__snapshots__/dialog/normal-button.png',
		);
		expect(result.pass, result.message).toBe(true);
	});

	test('dialog 2col — image', async () => {
		const dialog = renderDialog(imageHtml);
		await waitForRender();
		const base64 = await page.screenshot({ element: dialog, save: false });
		const result = await commands.matchScreenshot(
			base64,
			'__snapshots__/dialog/2col-image.png',
		);
		expect(result.pass, result.message).toBe(true);
	});

	test('dialog 2col — download-file', async () => {
		const dialog = renderDialog(downloadFileHtml);
		await waitForRender();
		const base64 = await page.screenshot({ element: dialog, save: false });
		const result = await commands.matchScreenshot(
			base64,
			'__snapshots__/dialog/2col-download-file.png',
		);
		expect(result.pass, result.message).toBe(true);
	});

	test('dialog wide — table', async () => {
		const dialog = renderDialog(tableHtml);
		await waitForRender();
		const base64 = await page.screenshot({ element: dialog, save: false });
		const result = await commands.matchScreenshot(
			base64,
			'__snapshots__/dialog/wide-table.png',
		);
		expect(result.pass, result.message).toBe(true);
	});
});
