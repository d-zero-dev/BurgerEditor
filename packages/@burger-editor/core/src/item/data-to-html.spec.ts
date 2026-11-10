import { describe, expect, test } from 'vitest';

import { dataFromHtml } from './data-from-html.js';
import { dataToHtml } from './data-to-html.js';

const TEMPLATE = '<div data-bge="wysiwyg"></div>';

/**
 * Parses saved HTML the way a published page does and reports what could run script.
 * @param html
 */
function inspect(html: string) {
	const doc = new DOMParser().parseFromString(html, 'text/html');
	const all = [...doc.querySelectorAll('*')];
	return {
		elements: all.map((el) => el.localName),
		eventHandlers: all.flatMap((el) =>
			[...el.attributes].filter((a) => a.name.startsWith('on')).map((a) => a.name),
		),
		protocols: [...doc.querySelectorAll('a')].map((a) => a.protocol),
	};
}

describe('dataToHtml: スクリプトが実行される形を保存しない', () => {
	test('タブを挟んだ javascript: の href', () => {
		const html = dataToHtml(TEMPLATE, {
			wysiwyg: '<a href="java&#x09;script:alert(1)">x</a>',
		});
		expect(inspect(html).protocols).not.toContain('javascript:');
	});

	// ペイロードの onerror は、保存の途中で本物の文書が解釈しても害の無い式にしてある
	test('MathML と style の組み合わせ（mXSS）', () => {
		const html = dataToHtml(TEMPLATE, {
			wysiwyg: '<math><mtext><table><mglyph><style><img src=x onerror=void(0)>',
		});
		expect(inspect(html).eventHandlers).toStrictEqual([]);
		expect(html).not.toMatch(/onerror/i);
	});

	test('noscript の中の閉じタグで抜け出す形', () => {
		const html = dataToHtml(TEMPLATE, {
			wysiwyg: '<noscript><p title="</noscript><img src=x onerror=void(0)>">',
		});
		// `DOMParser` は scripting が無効で、noscript の中身も要素として解釈するので、
		// 属性では見られない。公開ページ（scripting 有効）で img になる形が残っていない
		// ことを、文字列と noscript の有無で見る
		expect(inspect(html).elements).not.toContain('noscript');
		expect(html).not.toMatch(/onerror/i);
		expect(html).not.toContain('</noscript>');
	});

	test('SVG の animate が href を書き換える形', () => {
		const html = dataToHtml(TEMPLATE, {
			wysiwyg:
				'<svg><a><animate attributeName="href" to="javascript:alert(1)"/><text>x</text></a></svg>',
		});
		expect(inspect(html).elements).not.toContain('animate');
		expect(html).not.toMatch(/javascript/i);
	});

	test('保存した HTML は、もう一度通しても変わらない', () => {
		const once = dataToHtml(TEMPLATE, {
			wysiwyg: '<p>a</p><table><tr><td>b</td></tr></table><b>c',
		});
		expect(dataToHtml(once, dataFromHtml(once))).toBe(once);
	});
});

describe('dataToHtml: dangerouslySetInnerHTML', () => {
	test('true のときは取り除かない', () => {
		const html = dataToHtml(TEMPLATE, {
			dangerouslySetInnerHTML: true,
			wysiwyg: '<img src="x" onerror="void(0)">',
		});
		expect(inspect(html).eventHandlers).toStrictEqual(['onerror']);
	});
});

describe('dataFromHtml → dataToHtml', () => {
	test('保存済みの HTML は、読み書きを往復しても変わらない', () => {
		const saved =
			'<div data-bge="wysiwyg"><p style="--per-view: 3">a <a href="https://example.com/" target="_blank">b</a></p><bge-import src="https://example.com/x.html"></bge-import><img src="blob:https://example.com/0000" alt=""></div>';
		expect(dataToHtml(saved, dataFromHtml(saved))).toBe(saved);
	});
});
