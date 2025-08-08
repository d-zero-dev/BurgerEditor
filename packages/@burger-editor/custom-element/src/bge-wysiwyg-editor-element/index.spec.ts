import type { BgeWysiwygEditorElement } from './index.js';

import { Node } from '@tiptap/core';
import { test, expect, beforeAll, vi } from 'vitest';

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
	});
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
		<div data-bgc-style="button">
			<a href="https://example.com"><div><p>button like link outside of paragraph</p></div></a>
		</div>
	</bge-wysiwyg-editor>`;

	const editor = document.querySelector('bge-wysiwyg-editor') as BgeWysiwygEditorElement;
	editor.syncWysiwygToTextarea();
	expect(editor.value).toBe(
		'<p><a href="https://example.com">link</a>, <a class="button-like-link" href="https://example.com">button like link in paragraph</a></p><div data-bgc-style="button"><a href="https://example.com"><div><p>button like link outside of paragraph</p></div></a></div>',
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
		'<div data-bgc-style="button"><a href="path/to"><div><p>paragraph</p></div></a></div>',
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

test('the "table" block is enabled', () => {
	document.body.innerHTML = `<bge-wysiwyg-editor>
		<table>
			<caption>table caption</caption>
			<tr>
				<td>item 1</td>
				<td>item 2</td>
			</tr>
		</table>
	</bge-wysiwyg-editor>`;
	const editor = document.querySelector('bge-wysiwyg-editor') as BgeWysiwygEditorElement;
	editor.syncWysiwygToTextarea();
	expect(editor.value).toBe(
		'<table><caption>table caption</caption><tbody><tr><td><p>item 1</p></td><td><p>item 2</p></td></tr></tbody></table>',
	);
});

test('the "table" block is enabled with head and foot', () => {
	document.body.innerHTML = `<bge-wysiwyg-editor>
		<table>
			<caption>table caption</caption>
			<thead>
				<tr>
					<th>header 1</th>
					<th>header 2</th>
				</tr>
			</thead>
			<tbody>
			<tr>
				<td>item 1</td>
				<td>item 2</td>
			</tr>
			</tbody>
			<tfoot>
				<tr>
					<td>footer 1</td>
					<td>footer 2</td>
				</tr>
			</tfoot>
		</table>
	</bge-wysiwyg-editor>`;
	const editor = document.querySelector('bge-wysiwyg-editor') as BgeWysiwygEditorElement;
	editor.syncWysiwygToTextarea();
	expect(editor.value).toBe(
		'<table><caption>table caption</caption><thead><tr><th><p>header 1</p></th><th><p>header 2</p></th></tr></thead><tbody><tr><td><p>item 1</p></td><td><p>item 2</p></td></tr></tbody><tfoot><tr><td><p>footer 1</p></td><td><p>footer 2</p></td></tr></tfoot></table>',
	);
});

test('test extension is applied', () => {
	document.body.innerHTML = '<bge-wysiwyg-editor><test>test</test></bge-wysiwyg-editor>';
	const editor = document.querySelector('bge-wysiwyg-editor') as BgeWysiwygEditorElement;
	editor.syncWysiwygToTextarea();
	expect(editor.value).toBe('<test><p>test</p></test>');
});
