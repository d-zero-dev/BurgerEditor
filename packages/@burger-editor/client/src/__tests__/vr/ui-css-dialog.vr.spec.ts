import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { commands, page } from 'vitest/browser';

import {
	buttonHtml,
	downloadFileHtml,
	hrHtml,
	imageHtml,
	tableHtml,
} from './fixtures.js';
import { cleanUp, injectCSS, renderDialog, waitForRender } from './vr-helper.js';

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
