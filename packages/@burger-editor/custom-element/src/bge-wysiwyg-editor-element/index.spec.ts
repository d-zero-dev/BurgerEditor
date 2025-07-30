import type { BgeWysiwygEditorElement } from './index.js';

import { test, expect, beforeAll } from 'vitest';

import { defineBgeWysiwygEditorElement } from './index.js';

beforeAll(() => {
	defineBgeWysiwygEditorElement();
});

test('Defined', () => {
	const editor = document.createElement('bge-wysiwyg-editor') as BgeWysiwygEditorElement;
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
