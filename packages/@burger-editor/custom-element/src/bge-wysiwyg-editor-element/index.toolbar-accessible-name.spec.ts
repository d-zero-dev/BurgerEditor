import type { BgeWysiwygEditorElement as BgeWysiwygEditorElementType } from './index.js';

import { Node } from '@tiptap/core';
import { test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';

import { BgeWysiwygEditorElement, defineBgeWysiwygEditorElement } from './index.js';

const EXPECTED_TOOLBAR_BUTTON_NAMES: Readonly<Record<string, string>> = {
	bold: '太字',
	italic: '斜体',
	underline: '下線',
	strikethrough: '取り消し線',
	subscript: '下付き',
	superscript: '上付き',
	link: 'リンク',
	'button-like-link': 'ボタン風リンク',
	blockquote: '引用',
	'bullet-list': '箇条書き',
	'ordered-list': '番号付きリスト',
	note: 'ノートブロック',
	h3: '見出しレベル3',
	h4: '見出しレベル4',
	h5: '見出しレベル5',
	h6: '見出しレベル6',
	'flex-box': 'フレックスボックス',
	'align-start': '左寄せ',
	'align-center': '中央寄せ',
	'align-end': '右寄せ',
};

/**
 *
 * @param element
 */
function getAccessibleNameFromLabelledBy(element: Element): string {
	const labelledBy = element.getAttribute('aria-labelledby');
	if (!labelledBy) {
		return '';
	}
	return labelledBy
		.split(/\s+/)
		.map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
		.join(' ')
		.trim();
}

beforeAll(() => {
	globalThis.document.execCommand = vi.fn();

	const testExtension = Node.create({
		name: 'test',
		group: 'block',
		content: 'paragraph+',
		parseHTML() {
			return [{ tag: 'test' }];
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
});

afterEach(() => {
	document.body.innerHTML = '';
});

test('default toolbar icon buttons use aria-labelledby labels from the accessible-name map', () => {
	document.body.innerHTML = '<bge-wysiwyg-editor><p>test</p></bge-wysiwyg-editor>';
	const editor = document.querySelector(
		'bge-wysiwyg-editor',
	) as BgeWysiwygEditorElementType;

	for (const command of BgeWysiwygEditorElement.defaultCommands) {
		const button = editor.querySelector<HTMLButtonElement>(
			`[data-bge-toolbar-button="${command}"]`,
		);
		expect(button, command).toBeTruthy();
		expect(button!.getAttribute('aria-labelledby')?.trim(), command).not.toBe('');
		expect(getAccessibleNameFromLabelledBy(button!), command).toBe(
			EXPECTED_TOOLBAR_BUTTON_NAMES[command],
		);
	}
});

test('html mode button keeps its visible text as the accessible name', () => {
	document.body.innerHTML = '<bge-wysiwyg-editor><p>test</p></bge-wysiwyg-editor>';
	const editor = document.querySelector(
		'bge-wysiwyg-editor',
	) as BgeWysiwygEditorElementType;
	const htmlModeButton = editor.querySelector<HTMLButtonElement>(
		'[data-bge-toolbar-button="html-mode"]',
	);

	expect(htmlModeButton?.textContent?.trim()).toBe('HTML Mode');
	expect(htmlModeButton?.getAttribute('aria-labelledby')).toBeNull();
});

test('toolbar icon buttons hide decorative SVG from the accessibility tree', () => {
	document.body.innerHTML = '<bge-wysiwyg-editor><p>test</p></bge-wysiwyg-editor>';
	const editor = document.querySelector(
		'bge-wysiwyg-editor',
	) as BgeWysiwygEditorElementType;
	const buttons = [
		...editor.querySelectorAll<HTMLButtonElement>('[data-bge-toolbar-button]'),
	].filter((button) => button.querySelector('svg'));

	expect(buttons.length).toBeGreaterThan(0);

	for (const button of buttons) {
		const svg = button.querySelector('svg');
		expect(svg?.getAttribute('aria-hidden'), button.dataset.bgeToolbarButton).toBe(
			'true',
		);
	}
});
