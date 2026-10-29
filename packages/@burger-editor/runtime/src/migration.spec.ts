import { afterEach, describe, expect, it } from 'vitest';

import { migration } from './migration.js';

const ORIGIN = location.origin;

afterEach(() => {
	document.body.innerHTML = '';
});

describe('migration: popup href restored from background-image (v2.12.0 - v2.12.1)', () => {
	it.each([
		[
			'single-quoted relative path',
			"url('/path/to/image.png')",
			`${ORIGIN}/path/to/image.png`,
		],
		[
			'double-quoted absolute URL',
			'url("https://example.com/x.png")',
			'https://example.com/x.png',
		],
		['unquoted path', 'url(/x.png)', `${ORIGIN}/x.png`],
	])(
		'copies the background-image URL of .bgt-box__image to the link (%s)',
		(_, value, expected) => {
			document.body.innerHTML = `
			<div data-bge-popup="true">
				<a class="bgt-image__link">
					<figure><div class="bgt-box__image"></div></figure>
				</a>
			</div>`;
			document.querySelector<HTMLElement>('.bgt-box__image')!.style.backgroundImage =
				value;
			migration(document);
			// ポップアップのバインドで href は data-href に移る
			expect(document.querySelector('a')?.dataset.href).toBe(expected);
		},
	);

	it.each([
		['computed value "none"', 'style="background-image: none"'],
		['no background at all', ''],
	])('keeps the href when .bgt-box__image has no background image (%s)', (_, attr) => {
		document.body.innerHTML = `
			<div data-bge-popup="true">
				<a class="bgt-image__link" href="/orig.png">
					<figure><div class="bgt-box__image" ${attr}></div></figure>
				</a>
			</div>`;
		migration(document);
		expect(document.querySelector('a')?.dataset.href).toBe(`${ORIGIN}/orig.png`);
	});

	it('leaves links without .bgt-box__image alone', () => {
		document.body.innerHTML = `
			<div data-bge-popup="true">
				<a class="bgt-image__link" href="/keep.png"><figure><div class="bgt-box__image-container"><img src="/keep.png" alt="" /></div></figure></a>
			</div>`;
		migration(document);
		expect(document.querySelector('a')?.dataset.href).toBe(`${ORIGIN}/keep.png`);
	});
});

describe('migration: target="false"', () => {
	it('removes target="false" inside blocks and keeps other targets', () => {
		document.body.innerHTML = `
			<div data-bgb="wysiwyg"><a id="a" href="#" target="false">x</a><a id="b" href="#" target="_blank">y</a></div>
			<a id="c" href="#" target="false">outside</a>`;
		migration(document);
		expect(document.querySelector('#a')?.hasAttribute('target')).toBe(false);
		expect(document.querySelector('#b')?.getAttribute('target')).toBe('_blank');
		expect(document.querySelector('#c')?.getAttribute('target')).toBe('false');
	});
});

describe('migration: popup targets', () => {
	it('binds [data-bge-popup="1"], [data-bge-popup="true"] and legacy .bgt-colorbox links', () => {
		document.body.innerHTML = `
			<div data-bge-popup="1"><a id="a" href="/a.png"><img src="/a.png" alt="" /></a></div>
			<div data-bge-popup="true"><a id="b" href="/b.png"><img src="/b.png" alt="" /></a></div>
			<a id="c" class="bgt-colorbox" href="/c.png"><img src="/c.png" alt="" /></a>
			<div data-bge-popup="0"><a id="d" href="/d.png"><img src="/d.png" alt="" /></a></div>`;
		migration(document);
		for (const id of ['a', 'b', 'c']) {
			const a = document.querySelector<HTMLAnchorElement>(`#${id}`);
			expect(a?.hasAttribute('href'), id).toBe(false);
			expect(a?.dataset.href, id).toBe(`${ORIGIN}/${id}.png`);
			expect(a?.tabIndex, id).toBe(0);
			expect(a?.getAttribute('role'), id).toBe('button');
		}
		const d = document.querySelector<HTMLAnchorElement>('#d');
		expect(d?.getAttribute('href')).toBe('/d.png');
		expect(d?.dataset.href).toBeUndefined();
	});

	it('scopes to the given root', () => {
		document.body.innerHTML = `
			<div id="root"><div data-bge-popup="1"><a id="in" href="/in.png"></a></div></div>
			<div data-bge-popup="1"><a id="out" href="/out.png"></a></div>`;
		migration(document.querySelector<HTMLElement>('#root')!);
		expect(document.querySelector('#in')?.hasAttribute('href')).toBe(false);
		expect(document.querySelector('#out')?.getAttribute('href')).toBe('/out.png');
	});

	it('does not restore the href of an already bound popup link when run twice', () => {
		document.body.innerHTML = `
			<div data-bge-popup="true">
				<a class="bgt-image__link">
					<figure><div class="bgt-box__image" style="background-image: url('/x.png')"></div></figure>
				</a>
			</div>`;
		migration(document);
		migration(document);
		const a = document.querySelector<HTMLAnchorElement>('a');
		expect(a?.hasAttribute('href')).toBe(false);
		expect(a?.dataset.href).toBe(`${ORIGIN}/x.png`);
	});
});
