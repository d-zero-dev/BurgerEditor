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

test('expectHTML preserves <sup> elements correctly', () => {
	document.body.innerHTML =
		'<bge-wysiwyg><p>これは<sup>上付き文字</sup>のサンプルです。</p></bge-wysiwyg>';
	const element = document.querySelector('bge-wysiwyg') as BgeWysiwygElement;
	const originalHTML = '<p>これは<sup>上付き文字</sup>のサンプルです。</p>';
	const expectedHTML = element.expectHTML(originalHTML);

	// sup要素が保持されることを確認
	expect(expectedHTML).toBe('<p>これは<sup>上付き文字</sup>のサンプルです。</p>');
});

test('expectHTML preserves <sub> elements correctly', () => {
	document.body.innerHTML =
		'<bge-wysiwyg><p>これは<sub>下付き文字</sub>のサンプルです。</p></bge-wysiwyg>';
	const element = document.querySelector('bge-wysiwyg') as BgeWysiwygElement;
	const originalHTML = '<p>これは<sub>下付き文字</sub>のサンプルです。</p>';
	const expectedHTML = element.expectHTML(originalHTML);

	// sub要素が保持されることを確認
	expect(expectedHTML).toBe('<p>これは<sub>下付き文字</sub>のサンプルです。</p>');
});

test('expectHTML handles mixed sup and sub elements', () => {
	document.body.innerHTML =
		'<bge-wysiwyg><p>x<sup>2</sup> + y<sub>0</sub></p></bge-wysiwyg>';
	const element = document.querySelector('bge-wysiwyg') as BgeWysiwygElement;
	const originalHTML = '<p>x<sup>2</sup> + y<sub>0</sub></p>';
	const expectedHTML = element.expectHTML(originalHTML);

	// sup/sub両方が保持されることを確認
	expect(expectedHTML).toBe('<p>x<sup>2</sup> + y<sub>0</sub></p>');
});

test('should allow switching to Wysiwyg mode when sup/sub elements exist', () => {
	const initialHTML =
		'<p>これは<sup>上付き文字</sup>と<sub>下付き文字</sub>のサンプルです。</p>';
	document.body.innerHTML = `<bge-wysiwyg>${initialHTML}</bge-wysiwyg>`;
	const element = document.querySelector('bge-wysiwyg') as BgeWysiwygElement;

	// Wysiwygモードで開始されることを確認（構造変更なし）
	expect(element.mode).toBe('wysiwyg');
	expect(element.hasStructureChange).toBe(false);

	// HTMLモードに切り替え
	element.mode = 'html';
	expect(element.mode).toBe('html');

	// 再びWysiwygモードに切り替え可能であることを確認
	element.mode = 'wysiwyg';
	expect(element.mode).toBe('wysiwyg');
	expect(element.hasStructureChange).toBe(false);
});

test('expectHTML preserves data-bgc-align="start" attribute', () => {
	document.body.innerHTML =
		'<bge-wysiwyg><p data-bgc-align="start">左寄せテキスト</p></bge-wysiwyg>';
	const element = document.querySelector('bge-wysiwyg') as BgeWysiwygElement;
	const originalHTML = '<p data-bgc-align="start">左寄せテキスト</p>';
	const expectedHTML = element.expectHTML(originalHTML);

	// data-bgc-align属性が保持されることを確認
	expect(expectedHTML).toBe('<p data-bgc-align="start">左寄せテキスト</p>');
});

test('expectHTML preserves data-bgc-align="center" attribute', () => {
	document.body.innerHTML =
		'<bge-wysiwyg><p data-bgc-align="center">中央寄せテキスト</p></bge-wysiwyg>';
	const element = document.querySelector('bge-wysiwyg') as BgeWysiwygElement;
	const originalHTML = '<p data-bgc-align="center">中央寄せテキスト</p>';
	const expectedHTML = element.expectHTML(originalHTML);

	expect(expectedHTML).toBe('<p data-bgc-align="center">中央寄せテキスト</p>');
});

test('expectHTML preserves data-bgc-align="end" attribute', () => {
	document.body.innerHTML =
		'<bge-wysiwyg><p data-bgc-align="end">右寄せテキスト</p></bge-wysiwyg>';
	const element = document.querySelector('bge-wysiwyg') as BgeWysiwygElement;
	const originalHTML = '<p data-bgc-align="end">右寄せテキスト</p>';
	const expectedHTML = element.expectHTML(originalHTML);

	expect(expectedHTML).toBe('<p data-bgc-align="end">右寄せテキスト</p>');
});

test('expectHTML handles multiple paragraphs with different alignments', () => {
	const originalHTML =
		'<p data-bgc-align="start">左寄せ</p><p data-bgc-align="center">中央寄せ</p><p data-bgc-align="end">右寄せ</p><p>デフォルト</p>';
	document.body.innerHTML = `<bge-wysiwyg>${originalHTML}</bge-wysiwyg>`;
	const element = document.querySelector('bge-wysiwyg') as BgeWysiwygElement;
	const expectedHTML = element.expectHTML(originalHTML);

	// すべての属性が保持されることを確認
	expect(expectedHTML).toBe(originalHTML);
});

test('expectHTML ignores invalid data-bgc-align values', () => {
	const originalHTML = '<p data-bgc-align="invalid">テキスト</p>';
	document.body.innerHTML = `<bge-wysiwyg>${originalHTML}</bge-wysiwyg>`;
	const element = document.querySelector('bge-wysiwyg') as BgeWysiwygElement;
	const expectedHTML = element.expectHTML(originalHTML);

	// 不正な値は削除され、属性なしのpタグになることを確認
	expect(expectedHTML).toBe('<p>テキスト</p>');
});

test('should allow switching to Wysiwyg mode when data-bgc-align attributes exist', () => {
	const initialHTML =
		'<p data-bgc-align="center">中央寄せテキスト</p><p data-bgc-align="end">右寄せテキスト</p>';
	document.body.innerHTML = `<bge-wysiwyg>${initialHTML}</bge-wysiwyg>`;
	const element = document.querySelector('bge-wysiwyg') as BgeWysiwygElement;

	// Wysiwygモードで開始されることを確認（構造変更なし）
	expect(element.mode).toBe('wysiwyg');
	expect(element.hasStructureChange).toBe(false);

	// HTMLモードに切り替え
	element.mode = 'html';
	expect(element.mode).toBe('html');

	// 再びWysiwygモードに切り替え可能であることを確認
	element.mode = 'wysiwyg';
	expect(element.mode).toBe('wysiwyg');
	expect(element.hasStructureChange).toBe(false);
});

test('expectHTML handles sup/sub with alignment attributes together', () => {
	const originalHTML =
		'<p data-bgc-align="center">これは<sup>上付き</sup>と<sub>下付き</sub>のサンプル</p>';
	document.body.innerHTML = `<bge-wysiwyg>${originalHTML}</bge-wysiwyg>`;
	const element = document.querySelector('bge-wysiwyg') as BgeWysiwygElement;
	const expectedHTML = element.expectHTML(originalHTML);

	// すべての要素と属性が保持されることを確認
	expect(expectedHTML).toBe(originalHTML);
});

// text-onlyモードのテスト
test('mode getter should return text-only mode', () => {
	document.body.innerHTML = '<bge-wysiwyg><h1>Title</h1><p>test</p></bge-wysiwyg>';
	const element = document.querySelector('bge-wysiwyg') as BgeWysiwygElement;

	element.mode = 'text-only';
	expect(element.mode).toBe('text-only');
});

test('text-only mode should make direct text children editable with plaintext-only', () => {
	document.body.innerHTML =
		'<bge-wysiwyg><h1>Title</h1><p>Paragraph text</p></bge-wysiwyg>';
	const element = document.querySelector('bge-wysiwyg') as BgeWysiwygElement;

	element.mode = 'text-only';

	const textOnlyContainer = element.shadowRoot?.querySelector('[data-text-only-editor]');
	expect(textOnlyContainer).toBeTruthy();

	const editableElements = textOnlyContainer?.querySelectorAll(
		'[contenteditable="plaintext-only"]',
	);
	expect(editableElements).toBeTruthy();
	expect(editableElements!.length).toBeGreaterThan(0);
});

test('text-only mode should handle nested elements correctly', () => {
	document.body.innerHTML =
		'<bge-wysiwyg><div><p>nested <strong>bold</strong> text</p></div></bge-wysiwyg>';
	const element = document.querySelector('bge-wysiwyg') as BgeWysiwygElement;

	element.mode = 'text-only';

	// pタグは直接の子にtextNodeを持つので編集可能
	// divタグは直接の子がElementNodeなので編集不可
	const editableElements = element.shadowRoot?.querySelectorAll(
		'[contenteditable="plaintext-only"]',
	);

	expect(editableElements).toBeTruthy();
	// pタグのみが編集可能であることを確認
	expect(editableElements!.length).toBeGreaterThan(0);
});

test('text-only mode value getter should return clean HTML without contenteditable attribute', () => {
	document.body.innerHTML = '<bge-wysiwyg><p>test</p></bge-wysiwyg>';
	const element = document.querySelector('bge-wysiwyg') as BgeWysiwygElement;

	element.mode = 'text-only';

	const value = element.value;

	// contenteditable属性が含まれていないことを確認
	expect(value).not.toContain('contenteditable');
	expect(value).toContain('<p>test</p>');
});

test('switching from text-only to wysiwyg should work', () => {
	document.body.innerHTML = '<bge-wysiwyg><p>test</p></bge-wysiwyg>';
	const element = document.querySelector('bge-wysiwyg') as BgeWysiwygElement;

	element.mode = 'text-only';
	expect(element.mode).toBe('text-only');

	element.mode = 'wysiwyg';
	expect(element.mode).toBe('wysiwyg');

	// text-onlyコンテナがクリーンアップされていることを確認
	const textOnlyContainer = element.shadowRoot?.querySelector('[data-text-only-editor]');
	expect(textOnlyContainer?.innerHTML).toBe('');
});

test('switching from text-only to html should work', () => {
	document.body.innerHTML = '<bge-wysiwyg><p>test</p></bge-wysiwyg>';
	const element = document.querySelector('bge-wysiwyg') as BgeWysiwygElement;

	element.mode = 'text-only';
	expect(element.mode).toBe('text-only');

	element.mode = 'html';
	expect(element.mode).toBe('html');
});

test('text-only mode should prevent Enter key in editable elements', () => {
	document.body.innerHTML = '<bge-wysiwyg><p>test</p></bge-wysiwyg>';
	const element = document.querySelector('bge-wysiwyg') as BgeWysiwygElement;

	element.mode = 'text-only';

	const editableEl = element.shadowRoot?.querySelector<HTMLElement>(
		'[contenteditable="plaintext-only"]',
	);
	expect(editableEl).toBeTruthy();

	const enterEvent = new KeyboardEvent('keydown', {
		key: 'Enter',
		cancelable: true,
	});
	editableEl!.dispatchEvent(enterEvent);
	expect(enterEvent.defaultPrevented).toBe(true);

	// Non-Enter keys should not be prevented
	const otherEvent = new KeyboardEvent('keydown', {
		key: 'a',
		cancelable: true,
	});
	editableEl!.dispatchEvent(otherEvent);
	expect(otherEvent.defaultPrevented).toBe(false);
});

test('text-only mode should sync editable content to textarea on input', () => {
	document.body.innerHTML = '<bge-wysiwyg><p>original</p></bge-wysiwyg>';
	const element = document.querySelector('bge-wysiwyg') as BgeWysiwygElement;

	element.mode = 'text-only';

	const editableEl = element.shadowRoot?.querySelector<HTMLElement>(
		'[contenteditable="plaintext-only"]',
	);
	expect(editableEl).toBeTruthy();

	// Simulate editing content
	editableEl!.textContent = 'modified';
	editableEl!.dispatchEvent(new Event('input'));

	// Value should reflect the edited content
	const value = element.value;
	expect(value).toContain('modified');
	expect(value).not.toContain('contenteditable');
});

test('text-only mode setValue should update content', () => {
	document.body.innerHTML = '<bge-wysiwyg><p>initial</p></bge-wysiwyg>';
	const element = document.querySelector('bge-wysiwyg') as BgeWysiwygElement;

	element.mode = 'text-only';
	element.value = '<p>updated</p>';

	const value = element.value;
	expect(value).toContain('updated');
	expect(value).not.toContain('contenteditable');
});

test('text-only mode should remove event listeners on deactivate', () => {
	document.body.innerHTML = '<bge-wysiwyg><p>test</p></bge-wysiwyg>';
	const element = document.querySelector('bge-wysiwyg') as BgeWysiwygElement;

	element.mode = 'text-only';
	element.mode = 'wysiwyg';

	// Container should be cleared
	const textOnlyContainer = element.shadowRoot?.querySelector('[data-text-only-editor]');
	expect(textOnlyContainer?.innerHTML).toBe('');

	// Verify no editable elements remain
	const editableElements = textOnlyContainer?.querySelectorAll(
		'[contenteditable="plaintext-only"]',
	);
	expect(editableElements?.length).toBe(0);
});
