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
		experimental: { textOnlyMode: true },
	});
});

beforeEach(() => {
	document.body.innerHTML = '';
	vi.clearAllMocks();
});

afterEach(() => {
	document.body.innerHTML = '';
});

test('experimental mode renders select instead of buttons', () => {
	document.body.innerHTML = '<bge-wysiwyg-editor><p>test</p></bge-wysiwyg-editor>';
	const editor = document.querySelector('bge-wysiwyg-editor') as BgeWysiwygEditorElement;

	const modeSelector = editor.querySelector('[data-bge-mode-selector]');
	const htmlModeButton = editor.querySelector('[data-bge-toolbar-button="html-mode"]');
	const textOnlyModeButton = editor.querySelector(
		'[data-bge-toolbar-button="text-only-mode"]',
	);

	expect(modeSelector).toBeTruthy();
	expect(htmlModeButton).toBeNull();
	expect(textOnlyModeButton).toBeNull();
});

test('mode selector reflects current mode', () => {
	document.body.innerHTML = '<bge-wysiwyg-editor><p>test</p></bge-wysiwyg-editor>';
	const editor = document.querySelector('bge-wysiwyg-editor') as BgeWysiwygEditorElement;
	const wysiwygElement = editor.querySelector('bge-wysiwyg') as BgeWysiwygElement;
	const modeSelector = editor.querySelector(
		'[data-bge-mode-selector]',
	) as HTMLSelectElement;

	expect(modeSelector.value).toBe(wysiwygElement.mode);
});

test('mode selector switches between modes successfully', () => {
	document.body.innerHTML = '<bge-wysiwyg-editor><p>test</p></bge-wysiwyg-editor>';
	const editor = document.querySelector('bge-wysiwyg-editor') as BgeWysiwygEditorElement;
	const wysiwygElement = editor.querySelector('bge-wysiwyg') as BgeWysiwygElement;
	const modeSelector = editor.querySelector(
		'[data-bge-mode-selector]',
	) as HTMLSelectElement;

	// 初期状態はwysiwygモード
	expect(wysiwygElement.mode).toBe('wysiwyg');
	expect(modeSelector.value).toBe('wysiwyg');

	// HTMLモードに切り替え
	modeSelector.value = 'html';
	modeSelector.dispatchEvent(new Event('change'));
	expect(wysiwygElement.mode).toBe('html');

	// テキスト編集モードに切り替え
	modeSelector.value = 'text-only';
	modeSelector.dispatchEvent(new Event('change'));
	expect(wysiwygElement.mode).toBe('text-only');

	// デザインモードに切り替え
	modeSelector.value = 'wysiwyg';
	modeSelector.dispatchEvent(new Event('change'));
	expect(wysiwygElement.mode).toBe('wysiwyg');
});

test('mode selector disables wysiwyg option when structure changes', () => {
	document.body.innerHTML = '<bge-wysiwyg-editor><p>test</p></bge-wysiwyg-editor>';
	const editor = document.querySelector('bge-wysiwyg-editor') as BgeWysiwygEditorElement;
	const wysiwygElement = editor.querySelector('bge-wysiwyg') as BgeWysiwygElement;
	const modeSelector = editor.querySelector(
		'[data-bge-mode-selector]',
	) as HTMLSelectElement;
	const wysiwygOption = modeSelector.querySelector(
		'option[value="wysiwyg"]',
	) as HTMLOptionElement;

	// HTMLモードに切り替え
	modeSelector.value = 'html';
	modeSelector.dispatchEvent(new Event('change'));
	expect(wysiwygElement.mode).toBe('html');

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
		expect(wysiwygOption.disabled).toBe(true);
	}
});

test('mode selector reverts value when switch is prevented', () => {
	document.body.innerHTML = '<bge-wysiwyg-editor><p>test</p></bge-wysiwyg-editor>';
	const editor = document.querySelector('bge-wysiwyg-editor') as BgeWysiwygEditorElement;
	const wysiwygElement = editor.querySelector('bge-wysiwyg') as BgeWysiwygElement;
	const modeSelector = editor.querySelector(
		'[data-bge-mode-selector]',
	) as HTMLSelectElement;

	// HTMLモードに切り替え
	modeSelector.value = 'html';
	modeSelector.dispatchEvent(new Event('change'));
	expect(wysiwygElement.mode).toBe('html');

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

		// wysiwygモードへの切り替えを試みる（構造変更があるので防止される）
		modeSelector.value = 'wysiwyg';
		modeSelector.dispatchEvent(new Event('change'));

		// 切り替えが防止され、selectの値がhtmlに戻る
		expect(wysiwygElement.mode).toBe('html');
		expect(modeSelector.value).toBe('html');
	}
});

test('mode selector enables wysiwyg option when structure change is resolved', () => {
	document.body.innerHTML = '<bge-wysiwyg-editor><p>test</p></bge-wysiwyg-editor>';
	const editor = document.querySelector('bge-wysiwyg-editor') as BgeWysiwygEditorElement;
	const wysiwygElement = editor.querySelector('bge-wysiwyg') as BgeWysiwygElement;
	const modeSelector = editor.querySelector(
		'[data-bge-mode-selector]',
	) as HTMLSelectElement;
	const wysiwygOption = modeSelector.querySelector(
		'option[value="wysiwyg"]',
	) as HTMLOptionElement;

	// HTMLモードに切り替え
	modeSelector.value = 'html';
	modeSelector.dispatchEvent(new Event('change'));

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
		expect(wysiwygOption.disabled).toBe(true);

		// 構造が変わらないHTMLに変更
		wysiwygElement.value = '<p>test</p>';
		textarea?.dispatchEvent(new Event('input'));

		expect(wysiwygElement.hasStructureChange).toBe(false);
		expect(wysiwygOption.disabled).toBe(false);
	}
});
