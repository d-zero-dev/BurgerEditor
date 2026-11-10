import { describe, expect, test, vi } from 'vitest';

import FrozenPatty from './frozen-patty.js';
import {
	DANGEROUS_ELEMENTS,
	replaceNode,
	sanitizeAttributeValue,
	sanitizeHtml,
} from './utils.js';

/**
 * Writes `value` into a field of `tag` the way `dataToHtml()` does and returns
 * the saved HTML.
 * @param value
 * @param tag
 */
function write(value: string, tag = 'div') {
	return new FrozenPatty(`<${tag} data-bge="wysiwyg"></${tag}>`, {
		attr: 'bge',
		typeConvert: true,
		xssSanitize: true,
	})
		.merge({ wysiwyg: value })
		.toHTML();
}

/**
 * Re-parses saved HTML the way a published page does and lists what it finds.
 * @param html
 */
function reparse(html: string) {
	const doc = new DOMParser().parseFromString(html, 'text/html');
	return {
		elements: [...doc.querySelectorAll('*')].map((el) => el.localName),
		attrs: [...doc.querySelectorAll('*')].flatMap((el) =>
			[...el.attributes].map((attr) => attr.name),
		),
		protocols: [...doc.querySelectorAll('a')].map((a) => a.protocol),
	};
}

describe('sanitizeHtml: 保存される HTML にスクリプトが実行される形を残さない', () => {
	test('タブを挟んだ javascript: は href ごと取り除く', () => {
		const html = write('<a href="java&#x09;script:alert(1)">x</a>');
		expect(reparse(html).protocols).not.toContain('javascript:');
		expect(html).not.toMatch(/javascript/i);
	});

	test.each([
		['LF を挟む', 'java&#x0A;script:alert(1)'],
		['CR を挟む', 'java&#x0D;script:alert(1)'],
		['名前付き文字参照のタブ', 'java&Tab;script:alert(1)'],
		['名前付き文字参照の LF', 'java&NewLine;script:alert(1)'],
		['先頭に C0 制御文字', '&#x01;javascript:alert(1)'],
		['先頭に空白', '  javascript:alert(1)'],
		['大文字小文字の混在', 'JaVaScRiPt:alert(1)'],
		['vbscript:', 'vbscript:msgbox(1)'],
		['data:', 'data:text/html,<b>x</b>'],
		['文字参照のコロン', 'javascript&colon;alert(1)'],
	])('href: %s', (_label, href) => {
		const html = write(`<a href="${href}">x</a>`);
		expect(html).not.toMatch(/href=/i);
	});

	test('MathML と style の組み合わせ（mXSS）で onerror 付きの要素を残さない', () => {
		const html = write('<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>');
		expect(reparse(html).attrs).not.toContain('onerror');
		expect(html).not.toMatch(/onerror/i);
	});

	test('noscript の中の閉じタグで抜け出す形を残さない', () => {
		const html = write('<noscript><p title="</noscript><img src=x onerror=alert(1)>">');
		// `DOMParser` は scripting が無効で、noscript の中身も要素として解釈する。
		// 公開ページ（scripting 有効）の解釈では `title` の中の `</noscript>` で
		// noscript が閉じて img が現れるので、`onerror` の属性ではなく、
		// noscript と `onerror` の文字列がどちらも残っていないことを見る
		expect(reparse(html).elements).not.toContain('noscript');
		expect(html).not.toMatch(/onerror/i);
		expect(html).not.toContain('</noscript>');
	});

	test('SVG の animate が href を書き換える形を残さない', () => {
		const html = write(
			'<svg><a><animate attributeName="href" to="javascript:alert(1)"/><text>x</text></a></svg>',
		);
		expect(reparse(html).elements).not.toContain('animate');
		expect(html).not.toMatch(/javascript/i);
	});

	test.each(['set', 'animatemotion', 'animatetransform'])(
		'SVG の %s も取り除く',
		(name) => {
			const html = write(
				`<svg><a><${name} attributeName="href" to="javascript:alert(1)"/></a></svg>`,
			);
			expect(html).not.toMatch(/javascript/i);
		},
	);

	test('危険な要素は中身ごと取り除く', () => {
		expect(write('a<script>alert(1)</script>b')).toBe('<div data-bge="wysiwyg">ab</div>');
	});

	test('大文字の要素名も取り除く', () => {
		expect(reparse(write('<SCRIPT>alert(1)</SCRIPT>')).elements).not.toContain('script');
	});

	test('on* 属性は大文字でも取り除く', () => {
		expect(reparse(write('<img src="x" ONERROR="alert(1)">')).attrs).not.toContain(
			'onerror',
		);
	});
});

describe('sanitizeHtml: base / meta / link', () => {
	test('base は取り除く', () => {
		expect(
			reparse(write('<base href="https://attacker.example/">')).elements,
		).not.toContain('base');
	});

	test('http-equiv を持つ meta は取り除く', () => {
		expect(
			reparse(
				write('<meta http-equiv="refresh" content="0;url=https://attacker.example/">'),
			).elements,
		).not.toContain('meta');
	});

	test('itemprop を持たない link は取り除く', () => {
		expect(
			reparse(write('<link rel="stylesheet" href="https://attacker.example/x.css">'))
				.elements,
		).not.toContain('link');
	});

	test.each(['stylesheet', 'preload', 'prefetch', 'canonical'])(
		'itemprop を持っていても rel="%s" の link は取り除く',
		(rel) => {
			expect(
				reparse(
					write(`<link itemprop="x" rel="${rel}" href="https://attacker.example/s.css">`),
				).elements,
			).not.toContain('link');
		},
	);

	test('microdata の meta[itemprop] と link[itemprop] は残す', () => {
		const html = write(
			'<div itemscope><meta itemprop="name" content="x"><link itemprop="url" href="https://example.com/"></div>',
		);
		expect(reparse(html).elements).toStrictEqual(
			expect.arrayContaining(['meta', 'link']),
		);
	});
});

describe('sanitizeHtml: 隣り合う危険な要素', () => {
	test('連続する危険な要素の次の要素も掃除する（空にしない）', () => {
		const run = '<script></script>'.repeat(40);
		expect(sanitizeHtml(`${run}<img src="x" onerror="alert(1)">`)).toBe('<img src="x">');
	});
});

describe('sanitizeHtml: 挿入先を渡す', () => {
	test('名前を渡すと、その要素の文脈で解釈する', () => {
		expect(sanitizeHtml('<td>x</td>', 'tr')).toBe('<td>x</td>');
		expect(sanitizeHtml('<td>x</td>')).toBe('x');
	});

	test('SVG の要素を渡すと、SVG の文脈で解釈する', () => {
		const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
		expect(sanitizeHtml('<tspan>x</tspan><animate attributeName="href"/>', text)).toBe(
			'<tspan>x</tspan>',
		);
	});

	test('td の要素を渡して、イベントハンドラを取り除く', () => {
		const cell = document.createElement('td');
		cell.innerHTML = sanitizeHtml('<p onclick="x()">a</p>', cell);
		expect(cell.innerHTML).toBe('<p>a</p>');
	});

	test('タグだけを外して中身を残すことはしない', () => {
		expect(sanitizeHtml('a<script>alert(1)</script>b')).toBe('ab');
	});
});

describe('sanitizeHtml: script / style の文脈', () => {
	// 中身がそのままコードになるので、どんな文字列も安全にならない（`<` を含まない `alert(1)` も）
	test.each(['script', 'style', 'SCRIPT'])('文脈が %s なら、空文字を返す', (name) => {
		expect(sanitizeHtml('alert(1)', name)).toBe('');
		expect(sanitizeHtml('<b>x</b><img src=x onerror=a()>', name)).toBe('');
	});

	test('要素を渡しても同じ（SVG の script / style を含む）', () => {
		const svgNs = 'http://www.w3.org/2000/svg';
		expect(sanitizeHtml('alert(1)', document.createElement('script'))).toBe('');
		expect(sanitizeHtml('alert(1)', document.createElementNS(svgNs, 'script'))).toBe('');
		expect(sanitizeHtml('a{}', document.createElementNS(svgNs, 'style'))).toBe('');
	});

	test('textarea と title は、文字として入るだけなので、これまでどおり', () => {
		expect(sanitizeHtml('alert(1)', 'textarea')).toBe('alert(1)');
		expect(sanitizeHtml('<b>x</b>', 'title')).toBe('&lt;b&gt;x&lt;/b&gt;');
	});
});

describe('sanitizeHtml: template の文脈', () => {
	test('template の中身（content）も掃除する', () => {
		expect(sanitizeHtml('<img src="x" onerror="alert(1)">', 'template')).toBe(
			'<img src="x">',
		);
	});
});

describe('sanitizeHtml: ノード名の束縛', () => {
	/**
	 *
	 * @param nodeName
	 * @param attrs
	 */
	function bindNode(nodeName: string, attrs = '') {
		return new FrozenPatty(`<div ${attrs} data-bge="element:node"></div>`, {
			attr: 'bge',
			xssSanitize: true,
		})
			.merge({ element: nodeName })
			.toHTML();
	}

	test('meta[http-equiv] への付け替えは拒否する', () => {
		expect(
			bindNode('meta', 'http-equiv="refresh" content="0;url=https://attacker.example/"'),
		).not.toContain('<meta');
	});

	test('itemprop の無い link への付け替えは拒否する', () => {
		expect(bindNode('link', 'href="https://attacker.example/x.css"')).not.toContain(
			'<link',
		);
	});

	test('itemprop を持つ link への付け替えは許す', () => {
		expect(bindNode('link', 'itemprop="url" href="https://example.com/"')).toContain(
			'<link',
		);
	});

	test('安全な要素への付け替えは許す', () => {
		expect(bindNode('span')).toContain('<span');
	});

	test.each(['noscript', 'base'])(
		'%s への付け替えは、元の要素を残して拒否する',
		(name) => {
			expect(bindNode(name)).toBe('<div data-bge="element:node"></div>');
		},
	);

	test('attributeName が href の animate への付け替えは拒否し、opacity なら許す', () => {
		expect(bindNode('animate', 'attributeName="href"')).toBe(
			'<div attributeName="href" data-bge="element:node"></div>'.replace(
				'attributeName',
				'attributename',
			),
		);
		expect(bindNode('animate', 'attributeName="opacity"')).toContain('<animate');
	});

	test('replaceNode 単体でも、属性を写した後の meta[http-equiv] は元の要素を返す', () => {
		const parent = document.createElement('div');
		const el = document.createElement('div');
		el.setAttribute('http-equiv', 'refresh');
		parent.append(el);
		expect(replaceNode(el, 'meta', 'bge')).toBe(el);
		expect(parent.firstElementChild).toBe(el);
	});

	test('replaceNode 単体でも、itemprop の無い link は元の要素を返す', () => {
		const parent = document.createElement('div');
		const el = document.createElement('div');
		parent.append(el);
		expect(replaceNode(el, 'link', 'bge')).toBe(el);
		expect(parent.firstElementChild).toBe(el);
	});

	test('付け替えの後に別の欄が rel を付けて link を危険にしたら、取り除く', () => {
		const html = new FrozenPatty(
			'<div><div itemprop="x" data-bge="element:node, rel:rel, url:href"></div></div>',
			{ attr: 'bge', xssSanitize: true },
		)
			.merge({
				element: 'link',
				rel: 'stylesheet',
				url: 'https://attacker.example/s.css',
			})
			.toHTML();
		expect(html).not.toContain('<link');
	});
});

describe('sanitizeHtml: リストの項目', () => {
	test('項目のルートの link に、欄が rel を付けて危険にしたら、その項目を取り除く', () => {
		const html = new FrozenPatty(
			'<div data-bge-list><link itemprop="x" data-bge="rel:rel, url:href"></div>',
			{ attr: 'bge', xssSanitize: true },
		)
			.merge({ rel: ['stylesheet'], url: ['https://attacker.example/s.css'] })
			.toHTML();
		expect(html).not.toContain('<link');
	});

	test('rel を付けない項目は残す', () => {
		const html = new FrozenPatty(
			'<div data-bge-list><link itemprop="x" data-bge="url:href"></div>',
			{ attr: 'bge', xssSanitize: true },
		)
			.merge({ url: ['https://example.com/'] })
			.toHTML();
		expect(html).toContain('<link');
	});
});

describe('sanitizeHtml: 名前空間', () => {
	// SVG の中では `<title>` の中身が要素、HTML の中では文字列（RCDATA）として解釈される。
	// 文脈を `div` に固定すると、この 2 つが入れ替わる
	const PAYLOAD = '<title><img src=x onerror=alert(1)></title>';

	test('SVG の要素を文脈にすると、title の中の img を要素として掃除する', () => {
		const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
		expect(sanitizeHtml(PAYLOAD, text)).toBe('<title><img src="x"></title>');
	});

	test('名前で渡すと HTML の文脈になり、title の中身は文字列のまま残る', () => {
		expect(sanitizeHtml(PAYLOAD, 'div')).toBe(
			'<title>&lt;img src=x onerror=alert(1)&gt;</title>',
		);
	});

	test('SVG の要素のフィールドに書くと、SVG の文脈で掃除して保存する', () => {
		const html = new FrozenPatty('<svg><text data-bge="wysiwyg"></text></svg>', {
			attr: 'bge',
			xssSanitize: true,
		})
			.merge({ wysiwyg: PAYLOAD })
			.toHTML();
		expect(html).toBe(
			'<svg><text data-bge="wysiwyg"><title><img src="x"></title></text></svg>',
		);
	});
});

describe('sanitizeHtml: 文脈が meta のとき', () => {
	test('meta の content（文字列）を子要素と取り違えない', () => {
		expect(() => sanitizeHtml('<b>x</b><img src=x onerror=a()>', 'meta')).not.toThrow();
		expect(sanitizeHtml('<b>x</b><img src=x onerror=a()>', 'meta')).not.toMatch(
			/onerror/i,
		);
	});
});

describe('sanitizeHtml: マークアップの無い文字列', () => {
	test('空文字と通常の文字列はそのまま返す', () => {
		expect(sanitizeHtml('')).toBe('');
		expect(sanitizeHtml('plain text')).toBe('plain text');
	});

	test('`<` の無い文字列は、`&` を含んでいても解釈せずそのまま返す（文字参照は要素にならない）', () => {
		expect(sanitizeHtml('a & b')).toBe('a & b');
		expect(sanitizeHtml('&lt;script&gt;')).toBe('&lt;script&gt;');
		expect(sanitizeHtml('&#60;img src=x onerror=a()&#62;')).toBe(
			'&#60;img src=x onerror=a()&#62;',
		);
	});

	test('そのまま返した文字列は、解釈してもテキストだけになる', () => {
		const div = document.createElement('div');
		div.innerHTML = sanitizeHtml('&lt;img src=x onerror=a()&gt; &#60;b&#62;');
		expect(div.children).toHaveLength(0);
	});

	test('2 周目で安定する入力は、安定した文字列を返す（空にしない）', () => {
		expect(sanitizeHtml('<p>a<b>c')).toBe('<p>a<b>c</b></p>');
	});
});

describe('FrozenPatty: テンプレートが安定しないとき', () => {
	test('空のテンプレートになる（部分的に掃除したものは返さない）', () => {
		let n = 0;
		const getter = vi
			.spyOn(Element.prototype, 'innerHTML', 'get')
			.mockImplementation(() => `<p>${n++}</p>`);
		try {
			// `toHTML()` reads the mocked `innerHTML`, so look at the nodes
			const dom = new FrozenPatty('<p data-bge="a">x</p>', { attr: 'bge' }).toDOM();
			expect(dom.childNodes).toHaveLength(0);
		} finally {
			getter.mockRestore();
		}
	});
});

describe('sanitizeHtml: 残すもの', () => {
	test.each([
		['bge-import', '<bge-import src="https://example.com/a.html"></bge-import>'],
		['button[command]', '<button command="show-modal">x</button>'],
		['style 属性', '<p style="--per-view: 3">x</p>'],
		['data-* 属性', '<p data-size="2">x</p>'],
		['blob: の src', '<img src="blob:https://example.com/0000">'],
		['mailto:', '<a href="mailto:a@example.com">x</a>'],
		['tel:', '<a href="tel:0300000000">x</a>'],
		['相対 URL', '<a href="./a.html">x</a>'],
		['アンカー', '<a href="#top">x</a>'],
	])('%s', (_label, html) => {
		expect(write(html)).toBe(`<div data-bge="wysiwyg">${html}</div>`);
	});
});

describe('sanitizeHtml: 挿入先の文脈', () => {
	test('div の field では tr / td は解釈で落ちるので、中身の文字だけが残る', () => {
		const html = write('<tr><td>x</td></tr>');
		expect(html).toBe('<div data-bge="wysiwyg">x</div>');
		const div = document.createElement('div');
		div.innerHTML = html;
		expect(div.innerHTML).toBe(html);
	});

	test('tr の field では td を保つ（文脈が div 固定なら落ちる）', () => {
		const html = new FrozenPatty(
			'<table><tbody><tr data-bge="wysiwyg"></tr></tbody></table>',
			{ attr: 'bge', xssSanitize: true },
		)
			.merge({ wysiwyg: '<td>x</td>' })
			.toHTML();
		expect(html).toBe(
			'<table><tbody><tr data-bge="wysiwyg"><td>x</td></tr></tbody></table>',
		);
	});

	test('td の field では、セルの中身を保つ', () => {
		const html = new FrozenPatty(
			'<table><tbody><tr><td data-bge="wysiwyg"></td></tr></tbody></table>',
			{ attr: 'bge', typeConvert: true, xssSanitize: true },
		)
			.merge({ wysiwyg: '<p>x</p><b>y</b>' })
			.toHTML();
		expect(html).toBe(
			'<table><tbody><tr><td data-bge="wysiwyg"><p>x</p><b>y</b></td></tr></tbody></table>',
		);
	});

	test('出力をもう一度通しても変わらない', () => {
		const once = sanitizeHtml('<p>a</p><table><tr><td>b</td></tr></table><b>c');
		expect(sanitizeHtml(once)).toBe(once);
	});

	test('掃除のたびに文字列化の結果が変わり続けるときは空にする', () => {
		// 保存された HTML を公開ページが解釈し直したときの木を保証できないので、
		// 部分的に掃除した結果を返さず捨てる
		let n = 0;
		const getter = vi
			.spyOn(Element.prototype, 'innerHTML', 'get')
			.mockImplementation(() => `<p>${n++}</p>`);
		try {
			expect(sanitizeHtml('<p>x</p>')).toBe('');
		} finally {
			getter.mockRestore();
		}
	});
});

describe('sanitizeHtml: 型の揺れ', () => {
	test('文字列でなければ空文字', () => {
		expect(sanitizeHtml(undefined as unknown as string)).toBe('');
	});
});

describe('sanitizeHtml: URL を持つ属性（保存まで）', () => {
	test.each([
		['video', 'poster', 'javascript:alert(1)'],
		['video', 'poster', 'data:image/svg+xml,<svg/>'],
		['video', 'poster', 'data:text/html,<b>x</b>'],
		['blockquote', 'cite', 'javascript:alert(1)'],
		['table', 'background', 'JAVASCRIPT:alert(1)'],
		['a', 'ping', 'java\tscript:alert(1)'],
	])('<%s %s="%s"> の属性は取り除く', (tag, name, value) => {
		const html = write(`<${tag} ${name}="${value}"></${tag}>`);
		expect(html).not.toContain(`${name}=`);
	});

	test.each(['png', 'jpeg', 'gif', 'webp', 'avif', 'PNG'])(
		'src と poster の data:image/%s は画像として読み込まれるだけなので残す',
		(type) => {
			const url = `data:image/${type};base64,AAAA`;
			expect(write(`<img src="${url}">`)).toContain(`src="${url}"`);
			expect(write(`<video poster="${url}"></video>`)).toContain(`poster="${url}"`);
		},
	);

	test.each(['href', 'action', 'formaction', 'background', 'cite'])(
		'%s の data:image は残さない（画像として読み込まれる属性ではない）',
		(name) => {
			expect(write(`<a ${name}="data:image/png;base64,AAAA">x</a>`)).not.toContain(
				`${name}=`,
			);
		},
	);

	// `ping` は URL のリストで、検査するのは先頭の URL だけ。2 つ目以降は検査しない
	test('ping の 2 つ目以降の URL は検査しない', () => {
		const html = write(
			'<a href="https://example.com/" ping="https://ok.example javascript:x">x</a>',
		);
		expect(html).toContain('ping=');
	});
});

describe('sanitizeHtml: SVG のアニメーション要素', () => {
	const svg = (inner: string) => `<svg><rect>${inner}</rect></svg>`;

	test.each([
		['animate', 'opacity'],
		['set', 'fill'],
		['animateTransform', 'transform'],
	])(
		'%s で attributeName が %s のものは中身（アニメーション）として残す',
		(name, target) => {
			const html = write(svg(`<${name} attributeName="${target}" to="1"/>`));
			expect(html.toLowerCase()).toContain(`<${name.toLowerCase()}`);
		},
	);

	test('attributeName の無い animateMotion は残す', () => {
		expect(
			write(svg('<animateMotion dur="1s" path="M0,0 L1,1"/>')).toLowerCase(),
		).toContain('<animatemotion');
	});

	test.each([
		['href', 'href'],
		['大文字小文字', ' HREF '],
		['xlink:href', 'xlink:href'],
		['XLINK:HREF', 'XLINK:HREF'],
		['on*', 'onclick'],
		['ON*', 'ONCLICK'],
	])('attributeName が %s（%s）のものは取り除く', (_label, target) => {
		for (const name of ['animate', 'set', 'animateMotion', 'animateTransform']) {
			const html = write(
				svg(`<${name} attributeName="${target}" to="javascript:alert(1)"/>`),
			);
			expect(html.toLowerCase()).not.toContain(`<${name.toLowerCase()}`);
			expect(html).not.toMatch(/javascript/i);
		}
	});
});

describe('sanitizeHtml: 入れ子の template', () => {
	test('template を名前で落とす規則が外れても、中身（content）を掃除する', () => {
		const index = DANGEROUS_ELEMENTS.indexOf('template');
		DANGEROUS_ELEMENTS.splice(index, 1);
		try {
			expect(
				sanitizeHtml('<p><template><img src="x" onerror="alert(1)"></template></p>'),
			).toBe('<p><template><img src="x"></template></p>');
		} finally {
			DANGEROUS_ELEMENTS.splice(index, 0, 'template');
		}
	});
});

describe('sanitizeHtml: 収束しないときの警告', () => {
	test('空にして、console.warn で知らせる', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		let n = 0;
		const getter = vi
			.spyOn(Element.prototype, 'innerHTML', 'get')
			.mockImplementation(() => `<p>${n++}</p>`);
		try {
			expect(sanitizeHtml('<p>x</p>')).toBe('');
			expect(warn).toHaveBeenCalledOnce();
		} finally {
			getter.mockRestore();
			warn.mockRestore();
		}
	});

	test('収束するときは警告しない', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		try {
			sanitizeHtml('<p>a<b>c');
			expect(warn).not.toHaveBeenCalled();
		} finally {
			warn.mockRestore();
		}
	});
});

describe('sanitizeAttributeValue: イベントハンドラの名前', () => {
	// `on` と英字だけの名前は、ハンドラの一覧を持たない限り区別できないので、`once` も取り除く
	test.each(['onclick', 'onerror', 'onanimationend', 'ONCLICK', 'once'])(
		'%s は取り除く',
		(name) => {
			expect(sanitizeAttributeValue(name, 'x()')).toBeNull();
		},
	);

	test.each(['one-time', 'on-click', 'on', 'data-onclick'])(
		'%s はイベントハンドラではないので残す',
		(name) => {
			expect(sanitizeAttributeValue(name, 'x')).toBe('x');
		},
	);
});

describe('sanitizeAttributeValue', () => {
	test.each([
		['href', 'java\tscript:alert(1)'],
		['src', 'java\nscript:alert(1)'],
		['action', '\u0001javascript:alert(1)'],
		['formaction', ' \tJAVASCRIPT:alert(1)'],
		['xlink:href', 'java\rscript:alert(1)'],
		['HREF', 'javascript:alert(1)'],
		['poster', 'javascript:alert(1)'],
		['poster', 'data:image/svg+xml,<svg/>'],
		['ping', 'java\tscript:alert(1)'],
		['cite', 'javascript:alert(1)'],
		['background', 'JAVASCRIPT:alert(1)'],
	])('%s の %j は null', (name, value) => {
		expect(sanitizeAttributeValue(name, value)).toBeNull();
	});

	test('on* と manifest は null', () => {
		expect(sanitizeAttributeValue('onclick', 'x')).toBeNull();
		expect(sanitizeAttributeValue('manifest', 'x')).toBeNull();
	});

	test('安全な値はそのまま返す', () => {
		expect(sanitizeAttributeValue('href', 'https://example.com/a?b=c')).toBe(
			'https://example.com/a?b=c',
		);
		expect(sanitizeAttributeValue('title', 'javascript: is a language')).toBe(
			'javascript: is a language',
		);
	});
});
