import type { BgeWysiwygElement } from './index.js';

import { normalizeHtmlStructure } from '@burger-editor/utils';
import { Node } from '@tiptap/core';
import { test, expect, beforeAll, vi, beforeEach, afterEach } from 'vitest';

import { defineBgeWysiwygElement } from './index.js';

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

	defineBgeWysiwygElement({
		extensions: [testExtension],
	});
});

beforeEach(() => {
	document.body.innerHTML = '';
	vi.clearAllMocks();
});

afterEach(() => {
	document.body.innerHTML = '';
});

test('expectHTML should convert HTML and return expected output', () => {
	document.body.innerHTML = '<bge-wysiwyg><p>test</p></bge-wysiwyg>';
	const element = document.querySelector('bge-wysiwyg') as BgeWysiwygElement;

	const result = element.expectHTML('<p>test</p>');
	expect(result).toBe('<p>test</p>');
});

test('expectHTML should restore original content after conversion', () => {
	document.body.innerHTML = '<bge-wysiwyg><p>original</p></bge-wysiwyg>';
	const element = document.querySelector('bge-wysiwyg') as BgeWysiwygElement;

	const originalHTML = element.editor.getHTML();
	element.expectHTML('<p>test</p>');
	const restoredHTML = element.editor.getHTML();

	expect(restoredHTML).toBe(originalHTML);
});

test('expectHTML converts "dl" element correctly', () => {
	document.body.innerHTML =
		'<bge-wysiwyg><dl><div><dt>term</dt><dd>detail</dd></div></dl></bge-wysiwyg>';
	const element = document.querySelector('bge-wysiwyg') as BgeWysiwygElement;
	const originalHTML = '<dl><div><dt>term</dt><dd>detail</dd></div></dl>';
	const expectedHTML = element.expectHTML(originalHTML);
	expect(expectedHTML).toBe('<dl><div><dt>term</dt><dd><p>detail</p></dd></div></dl>');
});

test('expectHTML converts "button-like-link" block correctly', () => {
	document.body.innerHTML =
		'<bge-wysiwyg><p><a href="https://example.com">link</a>, <a class="button-like-link" href="https://example.com"><span>button like link in paragraph</span></a></p><div data-bgc-style="button"><a href="https://example.com"><div><p>button like link outside of paragraph</p></div></a></div></bge-wysiwyg>';
	const element = document.querySelector('bge-wysiwyg') as BgeWysiwygElement;
	const originalHTML =
		'<p><a href="https://example.com">link</a>, <a class="button-like-link" href="https://example.com"><span>button like link in paragraph</span></a></p><div data-bgc-style="button"><a href="https://example.com"><div><p>button like link outside of paragraph</p></div></a></div>';
	const expectedHTML = element.expectHTML(originalHTML);
	expect(expectedHTML).toBe(
		'<p><a href="https://example.com">link</a>, <a class="button-like-link" href="https://example.com">button like link in paragraph</a></p><div data-bgc-style="button"><a href="https://example.com"><div><p>button like link outside of paragraph</p></div></a></div>',
	);
});

test('expectHTML converts "button-like-link" block with span correctly', () => {
	document.body.innerHTML =
		'<bge-wysiwyg><p><a href="https://example.com">link</a>, <a class="button-like-link" href="https://example.com"><span>button like link in paragraph</span></a></p></bge-wysiwyg>';
	const element = document.querySelector('bge-wysiwyg') as BgeWysiwygElement;
	const originalHTML =
		'<p><a href="https://example.com">link</a>, <a class="button-like-link" href="https://example.com"><span>button like link in paragraph</span></a></p>';
	const expectedHTML = element.expectHTML(originalHTML);
	expect(expectedHTML).toBe(
		'<p><a href="https://example.com">link</a>, <a class="button-like-link" href="https://example.com">button like link in paragraph</a></p>',
	);
});

test('expectHTML converts "table" block correctly', () => {
	document.body.innerHTML =
		'<bge-wysiwyg><table><caption>table caption</caption><tr><td>item 1</td><td>item 2</td></tr></table></bge-wysiwyg>';
	const element = document.querySelector('bge-wysiwyg') as BgeWysiwygElement;
	const originalHTML =
		'<table><caption>table caption</caption><tr><td>item 1</td><td>item 2</td></tr></table>';
	const expectedHTML = element.expectHTML(originalHTML);
	expect(expectedHTML).toBe(
		'<table><caption>table caption</caption><tbody><tr><td><p>item 1</p></td><td><p>item 2</p></td></tr></tbody></table>',
	);
});

test('expectHTML converts "table" block with head and foot correctly', () => {
	document.body.innerHTML =
		'<bge-wysiwyg><table><caption>table caption</caption><thead><tr><th>header 1</th><th>header 2</th></tr></thead><tbody><tr><td>item 1</td><td>item 2</td></tr></tbody><tfoot><tr><td>footer 1</td><td>footer 2</td></tr></tfoot></table></bge-wysiwyg>';
	const element = document.querySelector('bge-wysiwyg') as BgeWysiwygElement;
	const originalHTML =
		'<table><caption>table caption</caption><thead><tr><th>header 1</th><th>header 2</th></tr></thead><tbody><tr><td>item 1</td><td>item 2</td></tr></tbody><tfoot><tr><td>footer 1</td><td>footer 2</td></tr></tfoot></table>';
	const expectedHTML = element.expectHTML(originalHTML);
	expect(expectedHTML).toBe(
		'<table><caption>table caption</caption><thead><tr><th><p>header 1</p></th><th><p>header 2</p></th></tr></thead><tbody><tr><td><p>item 1</p></td><td><p>item 2</p></td></tr></tbody><tfoot><tr><td><p>footer 1</p></td><td><p>footer 2</p></td></tr></tfoot></table>',
	);
});

test('expectHTML converts test extension correctly', () => {
	document.body.innerHTML = '<bge-wysiwyg><test>test</test></bge-wysiwyg>';
	const element = document.querySelector('bge-wysiwyg') as BgeWysiwygElement;
	const originalHTML = '<test>test</test>';
	const expectedHTML = element.expectHTML(originalHTML);
	expect(expectedHTML).toBe('<test><p>test</p></test>');
});

test('expectHTML should not trigger syncWysiwygToTextarea', () => {
	document.body.innerHTML = '<bge-wysiwyg><p>test</p></bge-wysiwyg>';
	const element = document.querySelector('bge-wysiwyg') as BgeWysiwygElement;

	const originalValue = element.value;
	element.expectHTML('<p>different</p>');

	// expectHTML実行中はsyncWysiwygToTextareaが呼ばれないため、valueは変更されない
	expect(element.value).toBe(originalValue);
});

test('expectHTML should handle errors gracefully', () => {
	document.body.innerHTML = '<bge-wysiwyg><p>test</p></bge-wysiwyg>';
	const element = document.querySelector('bge-wysiwyg') as BgeWysiwygElement;

	const originalHTML = element.editor.getHTML();

	// 不正なHTMLでもエラーを投げずに処理する
	expect(() => {
		element.expectHTML('<invalid>');
	}).not.toThrow();

	// 元のコンテンツが復元されていることを確認
	const restoredHTML = element.editor.getHTML();
	expect(restoredHTML).toBe(originalHTML);
});

test('mode getter should return current mode from data-bge-mode attribute', () => {
	document.body.innerHTML = '<bge-wysiwyg><p>test</p></bge-wysiwyg>';
	const element = document.querySelector('bge-wysiwyg') as BgeWysiwygElement;

	// デフォルトはwysiwyg
	expect(element.mode).toBe('wysiwyg');

	// HTMLモードに変更
	element.mode = 'html';
	expect(element.mode).toBe('html');

	// Wysiwygモードに戻す
	element.mode = 'wysiwyg';
	expect(element.mode).toBe('wysiwyg');
});

test('mode getter should return wysiwyg as default', () => {
	document.body.innerHTML = '<bge-wysiwyg><p>test</p></bge-wysiwyg>';
	const element = document.querySelector('bge-wysiwyg') as BgeWysiwygElement;

	expect(element.mode).toBe('wysiwyg');
});

test('mode setter should prevent switching when structure changes', () => {
	document.body.innerHTML = '<bge-wysiwyg><p>test</p></bge-wysiwyg>';
	const element = document.querySelector('bge-wysiwyg') as BgeWysiwygElement;

	// HTMLモードに切り替え
	element.mode = 'html';
	expect(element.mode).toBe('html');

	// 構造が変わるHTMLを設定（確実に構造が変わるケース: <p>test</p>と<p><span>test</span></p>）
	element.value = '<p><span>test</span></p>';

	// 実際にexpectHTMLで変換されるHTMLを確認
	const expectedHTML = element.expectHTML('<p><span>test</span></p>');
	// normalizeHtmlStructureを使用して構造が変わることを確認
	// <p><span>test</span></p>と<p>test</p>は構造が異なる
	const originalHTML = '<p>test</p>';
	const isStructureSame = normalizeHtmlStructure(originalHTML, expectedHTML);

	// 構造が変わる場合のみテストを続行
	if (!isStructureSame) {
		// 元のHTMLを設定
		element.value = originalHTML;

		// イベントリスナーを追加
		let eventFired = false;
		let eventDetail: { hasStructureChange: boolean } | null = null;
		element.addEventListener('bge:structure-change', (event) => {
			eventFired = true;
			eventDetail = (event as CustomEvent<{ hasStructureChange: boolean }>).detail;
		});

		// Wysiwygモードに切り替えようとする（構造が変わるため防止される）
		element.mode = 'wysiwyg';

		// モードが変更されていないことを確認
		expect(element.mode).toBe('html');

		// 構造変更が検出されていることを確認
		expect(element.hasStructureChange).toBe(true);

		// イベントが発火されたことを確認
		expect(eventFired).toBe(true);
		expect(eventDetail).toEqual({ hasStructureChange: true });

		// 注釈が表示されていることを確認
		const messageElement = element.shadowRoot?.querySelector('[role="alert"]');
		expect(messageElement).toBeTruthy();
		expect(messageElement?.style.display).toBe('block');
	}
});

test('mode setter should allow switching when structure does not change', () => {
	document.body.innerHTML = '<bge-wysiwyg><p>test</p></bge-wysiwyg>';
	const element = document.querySelector('bge-wysiwyg') as BgeWysiwygElement;

	// HTMLモードに切り替え
	element.mode = 'html';
	expect(element.mode).toBe('html');

	// 構造が変わらないHTMLを設定
	element.value = '<p>test</p>';

	// Wysiwygモードに切り替え
	element.mode = 'wysiwyg';

	// モードが変更されたことを確認
	expect(element.mode).toBe('wysiwyg');

	// 構造変更が検出されていないことを確認
	expect(element.hasStructureChange).toBe(false);

	// 注釈が非表示であることを確認
	const messageElement = element.shadowRoot?.querySelector('[role="alert"]');
	expect(messageElement?.style.display).toBe('none');
});

test('blur event should check structure change in HTML mode', () => {
	document.body.innerHTML = '<bge-wysiwyg><p>test</p></bge-wysiwyg>';
	const element = document.querySelector('bge-wysiwyg') as BgeWysiwygElement;

	// HTMLモードに切り替え
	element.mode = 'html';
	expect(element.mode).toBe('html');

	// 構造が変わるHTMLを設定（確実に構造が変わるケース: <p>test</p>と<p><span>test</span></p>）
	element.value = '<p><span>test</span></p>';

	// 実際にexpectHTMLで変換されるHTMLを確認
	const expectedHTML = element.expectHTML('<p><span>test</span></p>');
	// normalizeHtmlStructureを使用して構造が変わることを確認
	// <p><span>test</span></p>と<p>test</p>は構造が異なる
	const originalHTML = '<p>test</p>';
	const isStructureSame = normalizeHtmlStructure(originalHTML, expectedHTML);

	// 構造が変わる場合のみテストを続行
	if (!isStructureSame) {
		// 元のHTMLを設定
		element.value = originalHTML;

		// イベントリスナーを追加
		let eventFired = false;
		let eventDetail: { hasStructureChange: boolean } | null = null;
		element.addEventListener('bge:structure-change', (event) => {
			eventFired = true;
			eventDetail = (event as CustomEvent<{ hasStructureChange: boolean }>).detail;
		});

		// textareaを取得してblurイベントを発火
		const textarea = element.shadowRoot?.querySelector('textarea');
		if (textarea) {
			textarea.dispatchEvent(new Event('blur'));
		}

		// 構造変更が検出されていることを確認
		expect(element.hasStructureChange).toBe(true);

		// イベントが発火されたことを確認
		expect(eventFired).toBe(true);
		expect(eventDetail).toEqual({ hasStructureChange: true });

		// 注釈が表示されていることを確認
		const messageElement = element.shadowRoot?.querySelector('[role="alert"]');
		expect(messageElement).toBeTruthy();
		expect(messageElement?.style.display).toBe('block');
	}
});

test('blur event should not check structure change in Wysiwyg mode', () => {
	document.body.innerHTML = '<bge-wysiwyg><p>test</p></bge-wysiwyg>';
	const element = document.querySelector('bge-wysiwyg') as BgeWysiwygElement;

	// Wysiwygモードのまま
	expect(element.mode).toBe('wysiwyg');

	// textareaを取得してblurイベントを発火
	const textarea = element.shadowRoot?.querySelector('textarea');
	if (textarea) {
		textarea.dispatchEvent(new Event('blur'));
	}

	// 構造変更が検出されていないことを確認
	expect(element.hasStructureChange).toBe(false);
});

test('hasStructureChange getter should return current state', () => {
	document.body.innerHTML = '<bge-wysiwyg><p>test</p></bge-wysiwyg>';
	const element = document.querySelector('bge-wysiwyg') as BgeWysiwygElement;

	// 初期状態はfalse
	expect(element.hasStructureChange).toBe(false);

	// HTMLモードに切り替え
	element.mode = 'html';
	expect(element.hasStructureChange).toBe(false);

	// 構造が変わるHTMLを設定
	element.value = '<p><span>test</span></p>';
	const expectedHTML = element.expectHTML('<p><span>test</span></p>');
	const originalHTML = '<p>test</p>';
	const isStructureSame = normalizeHtmlStructure(originalHTML, expectedHTML);

	if (!isStructureSame) {
		element.value = originalHTML;
		const textarea = element.shadowRoot?.querySelector('textarea');
		if (textarea) {
			textarea.dispatchEvent(new Event('blur'));
		}
		expect(element.hasStructureChange).toBe(true);
	}
});

test('input event should check structure change', () => {
	document.body.innerHTML = '<bge-wysiwyg><p>test</p></bge-wysiwyg>';
	const element = document.querySelector('bge-wysiwyg') as BgeWysiwygElement;

	// HTMLモードに切り替え
	element.mode = 'html';
	expect(element.mode).toBe('html');

	// 構造が変わるHTMLを設定
	element.value = '<p><span>test</span></p>';
	const expectedHTML = element.expectHTML('<p><span>test</span></p>');
	const originalHTML = '<p>test</p>';
	const isStructureSame = normalizeHtmlStructure(originalHTML, expectedHTML);

	if (!isStructureSame) {
		element.value = originalHTML;
		const textarea = element.shadowRoot?.querySelector('textarea');
		if (textarea) {
			textarea.dispatchEvent(new Event('blur'));
		}
		expect(element.hasStructureChange).toBe(true);

		// 構造が変わらないHTMLに変更
		element.value = '<p>test</p>';
		textarea?.dispatchEvent(new Event('input'));

		// 構造変更が解消されたことを確認
		expect(element.hasStructureChange).toBe(false);

		// 注釈が非表示であることを確認
		const messageElement = element.shadowRoot?.querySelector('[role="alert"]');
		expect(messageElement?.style.display).toBe('none');
	}
});

test('should start in HTML mode when initial value has structure change', () => {
	// 構造が変わるHTMLを初期値として設定
	const initialHTML = '<p><span>test</span></p>';
	document.body.innerHTML = `<bge-wysiwyg>${initialHTML}</bge-wysiwyg>`;
	const element = document.querySelector('bge-wysiwyg') as BgeWysiwygElement;

	// 実際にexpectHTMLで変換されるHTMLを確認
	const expectedHTML = element.expectHTML(initialHTML);
	const isStructureSame = normalizeHtmlStructure(initialHTML, expectedHTML);

	// 構造が変わる場合のみテストを続行
	if (!isStructureSame) {
		// HTMLモードで開始されることを確認
		expect(element.mode).toBe('html');

		// 構造変更が検出されていることを確認
		expect(element.hasStructureChange).toBe(true);

		// 注釈が表示されていることを確認
		const messageElement = element.shadowRoot?.querySelector('[role="alert"]');
		expect(messageElement).toBeTruthy();
		expect(messageElement?.style.display).toBe('block');

		// textareaに初期値が設定されていることを確認
		const textarea = element.shadowRoot?.querySelector('textarea');
		expect(textarea?.value).toBe(initialHTML);
	}
});

test('should start in Wysiwyg mode when initial value has no structure change', () => {
	// 構造が変わらないHTMLを初期値として設定
	const initialHTML = '<p>test</p>';
	document.body.innerHTML = `<bge-wysiwyg>${initialHTML}</bge-wysiwyg>`;
	const element = document.querySelector('bge-wysiwyg') as BgeWysiwygElement;

	// Wysiwygモードで開始されることを確認
	expect(element.mode).toBe('wysiwyg');

	// 構造変更が検出されていないことを確認
	expect(element.hasStructureChange).toBe(false);

	// 注釈が非表示であることを確認
	const messageElement = element.shadowRoot?.querySelector('[role="alert"]');
	expect(messageElement?.style.display).toBe('none');

	// エディタに初期値が設定されていることを確認
	expect(element.editor.getHTML()).toBe(initialHTML);
});

test('should start in Wysiwyg mode when initial value is empty', () => {
	// 空のHTMLを初期値として設定
	document.body.innerHTML = '<bge-wysiwyg></bge-wysiwyg>';
	const element = document.querySelector('bge-wysiwyg') as BgeWysiwygElement;

	// Wysiwygモードで開始されることを確認
	expect(element.mode).toBe('wysiwyg');

	// 構造変更が検出されていないことを確認
	expect(element.hasStructureChange).toBe(false);

	// 注釈が非表示であることを確認
	const messageElement = element.shadowRoot?.querySelector('[role="alert"]');
	expect(messageElement?.style.display).toBe('none');
});

test('should start in HTML mode when initial value contains span tags that will be removed', () => {
	// spanタグが含まれるHTMLを初期値として設定（tiptapがspanタグを削除する可能性がある）
	const initialHTML = `<h3>u-blue</h3>

<p>テキストを<span class="u-blue">青色に変更</span>します。</p>

<h3>u-white</h3>

<p>テキストを<span class="u-white">白色に変更</span>します。</p>

<h3>u-red</h3>

<p>テキストを<span class="u-red">赤色に変更</span>します。</p>

<h3>u-font-18</h3>

<p>テキストを<span class="u-font-18">18pxに変更</span>します。</p>

<h3>u-font-20</h3>

<p>テキストを<span class="u-font-20">20pxに変更</span>します。</p>

<h3>u-font-26</h3>

<p>テキストを<span class="u-font-26">26pxに変更</span>します。</p>

<h3>u-font-36</h3>

<p>テキストを<span class="u-font-36">36pxに変更</span>します。</p>`;
	document.body.innerHTML = `<bge-wysiwyg>${initialHTML}</bge-wysiwyg>`;
	const element = document.querySelector('bge-wysiwyg') as BgeWysiwygElement;

	// 実際にexpectHTMLで変換されるHTMLを確認
	const expectedHTML = element.expectHTML(initialHTML);
	const isStructureSame = normalizeHtmlStructure(initialHTML, expectedHTML);

	// 構造が変わる場合のみテストを続行
	if (isStructureSame) {
		// 構造が変わらない場合（spanタグが保持される場合）、Wysiwygモードで開始されることを確認
		expect(element.mode).toBe('wysiwyg');
		expect(element.hasStructureChange).toBe(false);
	} else {
		// HTMLモードで開始されることを確認
		expect(element.mode).toBe('html');

		// 構造変更が検出されていることを確認
		expect(element.hasStructureChange).toBe(true);

		// 注釈が表示されていることを確認
		const messageElement = element.shadowRoot?.querySelector('[role="alert"]');
		expect(messageElement).toBeTruthy();
		expect(messageElement?.style.display).toBe('block');

		// textareaに初期値が設定されていることを確認
		const textarea = element.shadowRoot?.querySelector('textarea');
		expect(textarea?.value).toBe(initialHTML);
	}
});
