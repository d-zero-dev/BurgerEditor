import type { BgeWysiwygEditorElement } from './index.js';

import { Node } from '@tiptap/core';
import { test, expect, beforeAll, vi } from 'vitest';

import { defineBgeWysiwygEditorElement } from './index.js';

beforeAll(() => {
	global.document.execCommand = vi.fn();

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

	defineBgeWysiwygEditorElement(testExtension);
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

test('the "value" attribute is set', () => {
	document.body.innerHTML = '<bge-wysiwyg-editor><p>test</p></bge-wysiwyg-editor>';
	const editor = document.querySelector('bge-wysiwyg-editor') as BgeWysiwygEditorElement;
	expect(editor.value).toBe('<p>test</p>');
});

test('the "dl" element is enabled', () => {
	document.body.innerHTML =
		'<bge-wysiwyg-editor><dl><div><dt>term</dt><dd>detail</dd></div></dl></bge-wysiwyg-editor>';
	const editor = document.querySelector('bge-wysiwyg-editor') as BgeWysiwygEditorElement;
	editor.syncWysiwygToTextarea();
	expect(editor.value).toBe('<dl><div><dt>term</dt><dd><p>detail</p></dd></div></dl>');
});

test('the "button-like-link" block is enabled', () => {
	document.body.innerHTML = `<bge-wysiwyg-editor>
		<p><a href="https://example.com">link</a>, <a class="button-like-link" href="https://example.com"><span>button like link in paragraph</span></a></p>
		<div class="button-like-link">
			<a href="https://example.com"><span>button like link outside of paragraph</span></a>
		</div>
	</bge-wysiwyg-editor>`;

	const editor = document.querySelector('bge-wysiwyg-editor') as BgeWysiwygEditorElement;
	editor.syncWysiwygToTextarea();
	expect(editor.value).toBe(
		'<p><a href="https://example.com">link</a>, <a class="button-like-link" href="https://example.com">button like link in paragraph</a></p><div class="button-like-link"><a href="https://example.com"><span>button like link outside of paragraph</span></a></div>',
	);
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
		'<div class="button-like-link"><a href="path/to"><span>paragraph</span></a></div>',
	);
});

test('the "button-like-link" block cannot wrap "a" element', () => {
	document.body.innerHTML = `<bge-wysiwyg-editor>
		<p><a href="https://example.com">link</a>, <a class="button-like-link" href="https://example.com"><span>button like link in paragraph</span></a></p>
	</bge-wysiwyg-editor>`;

	const editor = document.querySelector('bge-wysiwyg-editor') as BgeWysiwygEditorElement;

	const tiptapEditor = editor.editor;

	const can = tiptapEditor.can().chain().focus().toggleButtonLikeLink().run();
	expect(can).toBe(false);

	tiptapEditor.chain().focus().toggleButtonLikeLink({ href: 'path/to' }).run();
	editor.syncWysiwygToTextarea();
	expect(editor.value).toBe(
		'<p><a href="https://example.com">link</a>, <a class="button-like-link" href="https://example.com">button like link in paragraph</a></p>',
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
				<div class="button-like-link"><a href="https://example.com"><span>item 1</span></a></div>
				<div class="button-like-link"><a href="https://example.com"><span>item 2</span></a></div>
				<div class="button-like-link"><a href="https://example.com"><span>item 3</span></a></div>
			</div>
		</bge-wysiwyg-editor>`;
	const editor = document.querySelector('bge-wysiwyg-editor') as BgeWysiwygEditorElement;
	editor.syncWysiwygToTextarea();
	expect(editor.value).toBe(
		'<div data-bgc-flex-box="center"><div class="button-like-link"><a href="https://example.com"><span>item 1</span></a></div><div class="button-like-link"><a href="https://example.com"><span>item 2</span></a></div><div class="button-like-link"><a href="https://example.com"><span>item 3</span></a></div></div>',
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

test('test extension is applied', () => {
	document.body.innerHTML = '<bge-wysiwyg-editor><test>test</test></bge-wysiwyg-editor>';
	const editor = document.querySelector('bge-wysiwyg-editor') as BgeWysiwygEditorElement;
	editor.syncWysiwygToTextarea();
	expect(editor.value).toBe('<test><p>test</p></test>');
});
