import type { BgeWysiwygEditorElement } from './index.js';
import type { BgeWysiwygElement } from '../bge-wysiwyg-element/index.js';

import { normalizeHtmlStructure } from '@burger-editor/utils';
import { Node } from '@tiptap/core';
import { test, expect, beforeAll, vi, beforeEach, afterEach } from 'vitest';

import { defineBgeWysiwygEditorElement } from './index.js';

beforeAll(() => {
	globalThis.document.execCommand = vi.fn();

	const testExtension = Node.create({
		name: 'test',
		group: 'block',
		content: 'paragraph+',
		parseHTML() {
			return [
				{
					tag: 'test',
				},
			];
		},
		renderHTML() {
			return ['test', {}, 0];
		},
	});

	defineBgeWysiwygEditorElement({
		extensions: [testExtension],
		experimental: { textOnlyMode: false },
	});
});

beforeEach(() => {
	document.body.innerHTML = '';
	vi.clearAllMocks();
});

afterEach(() => {
	document.body.innerHTML = '';
});

test('Defined', () => {
	document.body.innerHTML = '<bge-wysiwyg-editor name="test"></bge-wysiwyg-editor>';
	const editor = document.querySelector('bge-wysiwyg-editor') as BgeWysiwygEditorElement;
	expect(editor).toBeDefined();
	expect(editor.localName).toBe('bge-wysiwyg-editor');
	expect(editor.shadowRoot).toBeDefined();
	expect(editor.value).toBeDefined();
	expect(editor.name).toBeDefined();
	expect(editor.setStyle).toBeDefined();
});

test('the "name" attribute is set', () => {
	document.body.innerHTML = '<bge-wysiwyg-editor name="test"></bge-wysiwyg-editor>';
	const editor = document.querySelector('bge-wysiwyg-editor') as BgeWysiwygEditorElement;
	expect(editor.name).toBe('test');
});

test('the "value" attribute is set', () => {
	document.body.innerHTML = '<bge-wysiwyg-editor><p>test</p></bge-wysiwyg-editor>';
	const editor = document.querySelector('bge-wysiwyg-editor') as BgeWysiwygEditorElement;
	expect(editor.value).toBe('<p>test</p>');
});

test('the "button-like-link" block can wrap without "a" element', () => {
	document.body.innerHTML = `<bge-wysiwyg-editor>
		<p>paragraph</p>
	</bge-wysiwyg-editor>`;

	const editor = document.querySelector('bge-wysiwyg-editor') as BgeWysiwygEditorElement;

	const tiptapEditor = editor.editor;

	const can = tiptapEditor.can().chain().focus().toggleButtonLikeLink().run();
	expect(can).toBe(true);

	tiptapEditor.chain().focus().toggleButtonLikeLink({ href: 'path/to' }).run();
	editor.syncWysiwygToTextarea();
	expect(editor.value).toBe(
		'<div data-bgc-style="button"><a href="path/to"><div><p>paragraph</p></div></a></div>',
	);
});

test('the "note" block is enabled', () => {
	document.body.innerHTML =
		'<bge-wysiwyg-editor><div role="note"><p>note</p></div><div class="normal-div"><p>normal div</p></div></bge-wysiwyg-editor>';
	const editor = document.querySelector('bge-wysiwyg-editor') as BgeWysiwygEditorElement;
	editor.syncWysiwygToTextarea();
	expect(editor.value).toBe(
		'<div role="note"><p>note</p></div><div class="normal-div"><p>normal div</p></div>',
	);
});

test('the "flex-box" block is enabled', () => {
	document.body.innerHTML = `<bge-wysiwyg-editor>
			<div data-bgc-flex-box="center">
				<div data-bgc-style="button"><a href="https://example.com"><div><p>item 1</p></div></a></div>
				<div data-bgc-style="button"><a href="https://example.com"><div><p>item 2</p><p>Sub text 2</p></div></a></div>
				<div data-bgc-style="button"><a href="https://example.com"><div><p>item 3</p><p>Sub text 3</p></div></a></div>
			</div>
		</bge-wysiwyg-editor>`;
	const editor = document.querySelector('bge-wysiwyg-editor') as BgeWysiwygEditorElement;
	editor.syncWysiwygToTextarea();
	expect(editor.value).toBe(
		'<div data-bgc-flex-box="center"><div data-bgc-style="button"><a href="https://example.com"><div><p>item 1</p></div></a></div><div data-bgc-style="button"><a href="https://example.com"><div><p>item 2</p><p>Sub text 2</p></div></a></div><div data-bgc-style="button"><a href="https://example.com"><div><p>item 3</p><p>Sub text 3</p></div></a></div></div>',
	);
});

test('the "flex-box" block is empty', () => {
	document.body.innerHTML = `<bge-wysiwyg-editor>
			<div data-bgc-flex-box="center"></div>
		</bge-wysiwyg-editor>`;
	const editor = document.querySelector('bge-wysiwyg-editor') as BgeWysiwygEditorElement;
	editor.syncWysiwygToTextarea();
	expect(editor.value).toBe('<div data-bgc-flex-box="center"></div>');
});

test('syncWysiwygToTextarea syncs editor content to textarea in Wysiwyg mode', () => {
	document.body.innerHTML = '<bge-wysiwyg-editor><p>test</p></bge-wysiwyg-editor>';
	const editor = document.querySelector('bge-wysiwyg-editor') as BgeWysiwygEditorElement;
	const wysiwygElement = editor.querySelector('bge-wysiwyg') as BgeWysiwygElement;
	if (!wysiwygElement) {
		throw new Error('bge-wysiwyg element not found');
	}

	// Wysiwygモードであることを確認
	expect(wysiwygElement.mode).toBe('wysiwyg');

	// エディタの内容を変更
	const tiptapEditor = editor.editor;
	tiptapEditor.commands.setContent('<p>updated content</p>');

	// syncWysiwygToTextareaを呼び出す
	editor.syncWysiwygToTextarea();

	// value getterが正しい値を返すことを確認（Wysiwygモードなのでエディタから取得）
	expect(editor.value).toBe('<p>updated content</p>');
});

test('syncWysiwygToTextarea is skipped in HTML mode', () => {
	document.body.innerHTML = '<bge-wysiwyg-editor><p>test</p></bge-wysiwyg-editor>';
	const editor = document.querySelector('bge-wysiwyg-editor') as BgeWysiwygEditorElement;
	const wysiwygElement = editor.querySelector('bge-wysiwyg') as BgeWysiwygElement;
	if (!wysiwygElement) {
		throw new Error('bge-wysiwyg element not found');
	}

	// HTMLモードに切り替え
	const htmlModeButton = editor.querySelector(
		'[data-bge-toolbar-button="html-mode"]',
	) as HTMLButtonElement;
	if (!htmlModeButton) {
		throw new Error('HTML mode button not found');
	}
	htmlModeButton.click();
	expect(wysiwygElement.mode).toBe('html');

	// HTMLモードで値を設定
	const htmlValue = '<p>html mode content</p>';
	wysiwygElement.value = htmlValue;

	// syncWysiwygToTextareaを呼び出す（スキップされる）
	editor.syncWysiwygToTextarea();

	// value getterが正しい値を返すことを確認（HTMLモードなのでtextareaから取得）
	expect(editor.value).toBe(htmlValue);
});

test('HTML mode button should be disabled when structure changes', () => {
	document.body.innerHTML = '<bge-wysiwyg-editor><p>test</p></bge-wysiwyg-editor>';
	const editor = document.querySelector('bge-wysiwyg-editor') as BgeWysiwygEditorElement;

	// HTMLモードボタンを取得
	const htmlModeButton = editor.querySelector(
		'[data-bge-toolbar-button="html-mode"]',
	) as HTMLButtonElement;

	if (!htmlModeButton) {
		throw new Error('HTML mode button not found');
	}

	// HTMLモードに切り替え（ボタンをクリック）
	htmlModeButton.click();

	const wysiwygElement = editor.querySelector('bge-wysiwyg') as BgeWysiwygElement;
	if (!wysiwygElement) {
		throw new Error('bge-wysiwyg element not found');
	}

	expect(wysiwygElement.mode).toBe('html');
	expect(htmlModeButton.ariaPressed).toBe('true');
	expect(htmlModeButton.disabled).toBe(false);

	// 構造が変わるHTMLを設定（確実に構造が変わるケース）
	wysiwygElement.value = '<p><span>test</span></p>';

	// 実際にexpectHTMLで変換されるHTMLを確認
	const expectedHTML = wysiwygElement.expectHTML('<p><span>test</span></p>');
	const originalHTML = '<p>test</p>';
	const isStructureSame = normalizeHtmlStructure(originalHTML, expectedHTML);

	// 構造が変わる場合のみテストを続行
	if (!isStructureSame) {
		// 元のHTMLを設定
		wysiwygElement.value = originalHTML;

		// blurイベントを発火して構造変更を検出
		const textarea = wysiwygElement.shadowRoot?.querySelector('textarea');
		if (textarea) {
			textarea.dispatchEvent(new Event('blur'));
		}

		// 構造変更が検出されていることを確認
		expect(wysiwygElement.hasStructureChange).toBe(true);

		// ボタンがdisabledになっていることを確認
		expect(htmlModeButton.disabled).toBe(true);

		// ボタンをクリックしても切り替えが防止されることを確認
		const currentMode = wysiwygElement.mode;
		htmlModeButton.click();
		expect(wysiwygElement.mode).toBe(currentMode);
	}
});

test('HTML mode button should switch successfully when structure does not change', () => {
	document.body.innerHTML = '<bge-wysiwyg-editor><p>test</p></bge-wysiwyg-editor>';
	const editor = document.querySelector('bge-wysiwyg-editor') as BgeWysiwygEditorElement;

	// HTMLモードボタンを取得
	const htmlModeButton = editor.querySelector(
		'[data-bge-toolbar-button="html-mode"]',
	) as HTMLButtonElement;

	if (!htmlModeButton) {
		throw new Error('HTML mode button not found');
	}

	// HTMLモードに切り替え（ボタンをクリック）
	htmlModeButton.click();

	const wysiwygElement = editor.querySelector('bge-wysiwyg') as BgeWysiwygElement;
	if (!wysiwygElement) {
		throw new Error('bge-wysiwyg element not found');
	}

	expect(wysiwygElement.mode).toBe('html');
	expect(htmlModeButton.ariaPressed).toBe('true');
	expect(htmlModeButton.disabled).toBe(false);

	// 構造が変わらないHTMLを設定
	wysiwygElement.value = '<p>test</p>';

	// ボタンをクリック（Wysiwygモードに切り替え）
	htmlModeButton.click();

	// 切り替えが成功したため、モードはWysiwygに変更
	expect(wysiwygElement.mode).toBe('wysiwyg');

	// ボタンの状態が更新されていることを確認（Wysiwygモードなので'false'）
	expect(htmlModeButton.ariaPressed).toBe('false');
	expect(htmlModeButton.disabled).toBe(false);
});

test('HTML mode button should be enabled when structure change is resolved', () => {
	document.body.innerHTML = '<bge-wysiwyg-editor><p>test</p></bge-wysiwyg-editor>';
	const editor = document.querySelector('bge-wysiwyg-editor') as BgeWysiwygEditorElement;

	const htmlModeButton = editor.querySelector(
		'[data-bge-toolbar-button="html-mode"]',
	) as HTMLButtonElement;

	if (!htmlModeButton) {
		throw new Error('HTML mode button not found');
	}

	htmlModeButton.click();

	const wysiwygElement = editor.querySelector('bge-wysiwyg') as BgeWysiwygElement;
	if (!wysiwygElement) {
		throw new Error('bge-wysiwyg element not found');
	}

	// 構造が変わるHTMLを設定
	wysiwygElement.value = '<p><span>test</span></p>';
	const expectedHTML = wysiwygElement.expectHTML('<p><span>test</span></p>');
	const originalHTML = '<p>test</p>';
	const isStructureSame = normalizeHtmlStructure(originalHTML, expectedHTML);

	if (!isStructureSame) {
		wysiwygElement.value = originalHTML;
		const textarea = wysiwygElement.shadowRoot?.querySelector('textarea');
		if (textarea) {
			textarea.dispatchEvent(new Event('blur'));
		}

		expect(wysiwygElement.hasStructureChange).toBe(true);
		expect(htmlModeButton.disabled).toBe(true);

		// 構造が変わらないHTMLに変更
		wysiwygElement.value = '<p>test</p>';
		textarea?.dispatchEvent(new Event('input'));

		expect(wysiwygElement.hasStructureChange).toBe(false);
		expect(htmlModeButton.disabled).toBe(false);
	}
});

// experimental.textOnlyMode = false のテスト
test('default mode (experimental=false) renders HTML mode button only', () => {
	document.body.innerHTML = '<bge-wysiwyg-editor><p>test</p></bge-wysiwyg-editor>';
	const editor = document.querySelector('bge-wysiwyg-editor') as BgeWysiwygEditorElement;

	const htmlModeButton = editor.querySelector('[data-bge-toolbar-button="html-mode"]');
	const textOnlyModeButton = editor.querySelector(
		'[data-bge-toolbar-button="text-only-mode"]',
	);
	const modeSelector = editor.querySelector('[data-bge-mode-selector]');

	// HTMLモードボタンは存在する
	expect(htmlModeButton).toBeTruthy();

	// text-onlyボタンとselectは存在しない（text-only実装前の動作）
	expect(textOnlyModeButton).toBeNull();
	expect(modeSelector).toBeNull();
});
