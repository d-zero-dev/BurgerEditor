import { beforeAll, afterEach, test, expect, describe } from 'vitest';

import { defineBgeWysiwygEditorElement, type BgeWysiwygEditorElement } from './index.js';

beforeAll(() => {
	defineBgeWysiwygEditorElement({
		experimental: { textOnlyMode: true },
	});
});

describe('Button disabling in non-WYSIWYG modes', () => {
	afterEach(() => {
		// Clean up after each test
		document.body.innerHTML = '';
	});
	test('All formatting buttons are enabled in WYSIWYG mode', () => {
		document.body.innerHTML =
			'<bge-wysiwyg-editor commands="bold,italic,underline,link"><p>test</p></bge-wysiwyg-editor>';
		const editor = document.querySelector(
			'bge-wysiwyg-editor',
		) as BgeWysiwygEditorElement;

		const boldButton = editor.querySelector(
			'[data-bge-toolbar-button="bold"]',
		) as HTMLButtonElement;
		const italicButton = editor.querySelector(
			'[data-bge-toolbar-button="italic"]',
		) as HTMLButtonElement;
		const linkButton = editor.querySelector(
			'[data-bge-toolbar-button="link"]',
		) as HTMLButtonElement;

		expect(editor.mode).toBe('wysiwyg');
		expect(boldButton.disabled).toBe(false);
		expect(italicButton.disabled).toBe(false);
		expect(linkButton.disabled).toBe(false);
	});

	test('All formatting buttons are disabled in HTML mode', () => {
		document.body.innerHTML =
			'<bge-wysiwyg-editor commands="bold,italic,underline,link"><p>test</p></bge-wysiwyg-editor>';
		const editor = document.querySelector(
			'bge-wysiwyg-editor',
		) as BgeWysiwygEditorElement;
		const modeSelector = editor.querySelector(
			'[data-bge-mode-selector]',
		) as HTMLSelectElement;

		// HTMLモードに切り替え
		modeSelector.value = 'html';
		modeSelector.dispatchEvent(new Event('change'));

		const boldButton = editor.querySelector(
			'[data-bge-toolbar-button="bold"]',
		) as HTMLButtonElement;
		const italicButton = editor.querySelector(
			'[data-bge-toolbar-button="italic"]',
		) as HTMLButtonElement;
		const linkButton = editor.querySelector(
			'[data-bge-toolbar-button="link"]',
		) as HTMLButtonElement;

		expect(editor.mode).toBe('html');
		expect(boldButton.disabled).toBe(true);
		expect(italicButton.disabled).toBe(true);
		expect(linkButton.disabled).toBe(true);
	});

	test('All formatting buttons are disabled in text-only mode', () => {
		document.body.innerHTML =
			'<bge-wysiwyg-editor commands="bold,italic,h3,bullet-list"><p>test</p></bge-wysiwyg-editor>';
		const editor = document.querySelector(
			'bge-wysiwyg-editor',
		) as BgeWysiwygEditorElement;
		const modeSelector = editor.querySelector(
			'[data-bge-mode-selector]',
		) as HTMLSelectElement;

		// text-onlyモードに切り替え
		modeSelector.value = 'text-only';
		modeSelector.dispatchEvent(new Event('change'));

		const boldButton = editor.querySelector(
			'[data-bge-toolbar-button="bold"]',
		) as HTMLButtonElement;
		const h3Button = editor.querySelector(
			'[data-bge-toolbar-button="h3"]',
		) as HTMLButtonElement;
		const bulletListButton = editor.querySelector(
			'[data-bge-toolbar-button="bullet-list"]',
		) as HTMLButtonElement;

		expect(editor.mode).toBe('text-only');
		expect(boldButton.disabled).toBe(true);
		expect(h3Button.disabled).toBe(true);
		expect(bulletListButton.disabled).toBe(true);
	});

	test('Formatting buttons are re-enabled when switching back to WYSIWYG mode', () => {
		document.body.innerHTML =
			'<bge-wysiwyg-editor commands="bold,italic"><p>test</p></bge-wysiwyg-editor>';
		const editor = document.querySelector(
			'bge-wysiwyg-editor',
		) as BgeWysiwygEditorElement;
		const modeSelector = editor.querySelector(
			'[data-bge-mode-selector]',
		) as HTMLSelectElement;

		// HTMLモードに切り替え
		modeSelector.value = 'html';
		modeSelector.dispatchEvent(new Event('change'));

		const boldButton = editor.querySelector(
			'[data-bge-toolbar-button="bold"]',
		) as HTMLButtonElement;
		expect(boldButton.disabled).toBe(true);

		// WYSIWYGモードに戻す
		modeSelector.value = 'wysiwyg';
		modeSelector.dispatchEvent(new Event('change'));

		expect(editor.mode).toBe('wysiwyg');
		expect(boldButton.disabled).toBe(false);
	});

	test('Mode switching button itself is never disabled', () => {
		document.body.innerHTML =
			'<bge-wysiwyg-editor commands="bold"><p>test</p></bge-wysiwyg-editor>';
		const editor = document.querySelector(
			'bge-wysiwyg-editor',
		) as BgeWysiwygEditorElement;
		const modeSelector = editor.querySelector(
			'[data-bge-mode-selector]',
		) as HTMLSelectElement;

		// 各モードでmode selector自体は常に有効
		expect(modeSelector.disabled).toBe(false);

		modeSelector.value = 'html';
		modeSelector.dispatchEvent(new Event('change'));
		expect(modeSelector.disabled).toBe(false);

		modeSelector.value = 'text-only';
		modeSelector.dispatchEvent(new Event('change'));
		expect(modeSelector.disabled).toBe(false);
	});

	test('Buttons respect TipTap disabled state in WYSIWYG mode', () => {
		document.body.innerHTML =
			'<bge-wysiwyg-editor commands="bold,bullet-list"><p>test</p></bge-wysiwyg-editor>';
		const editor = document.querySelector(
			'bge-wysiwyg-editor',
		) as BgeWysiwygEditorElement;

		// WYSIWYGモードでTipTapの状態を反映
		const boldButton = editor.querySelector(
			'[data-bge-toolbar-button="bold"]',
		) as HTMLButtonElement;
		const bulletListButton = editor.querySelector(
			'[data-bge-toolbar-button="bullet-list"]',
		) as HTMLButtonElement;

		expect(editor.mode).toBe('wysiwyg');
		// TipTapの実際の状態に基づいてボタンが制御されていることを確認
		expect(boldButton.disabled).toBe(false); // WYSIWYGモードなのでdisabledではない
		expect(bulletListButton.disabled).toBe(false); // WYSIWYGモードなのでdisabledではない
	});
});
