// dom-shim side-effect — must come before anything that touches DOMParser.
import '@burger-editor/file-io';

import { items } from '@burger-editor/blocks';
import { type NoEditableAreaError, itemImport, listBlocks } from '@burger-editor/core';
import { describe, expect, test, vi } from 'vitest';

import { applyBlockOpToHtml, normalizeBlockOp } from './apply-block-op.js';

/**
 * Minimal block markup: one wysiwyg item whose paragraph carries a text marker.
 * @param marker
 * @param id
 */
function block(marker: string, id = ''): string {
	const idAttr = id ? ` id="${id}"` : '';
	return (
		`<div${idAttr} data-bge-name="wysiwyg" data-bge-container="grid:1">` +
		'<div data-bge-container-frame><div data-bge-group><div data-bge-item>' +
		`<div data-bgi="wysiwyg" data-bgi-ver="0.0.0"><div data-bge="wysiwyg"><p>${marker}</p></div></div>` +
		'</div></div></div></div>'
	);
}

const THREE_BLOCKS = block('A') + block('B') + block('C');

/**
 * Block order as a marker list, e.g. ['A', 'B', 'C'].
 * @param html
 */
function markers(html: string | NoEditableAreaError): string[] {
	const blocks = listBlocks(html as string, null) as { html: string }[];
	return blocks.map((b) => /<p>([^<]*)<\/p>/.exec(b.html)![1]!);
}

describe('applyBlockOpToHtml insert', () => {
	test('index 0 prepends the block', () => {
		const result = applyBlockOpToHtml(THREE_BLOCKS, {
			op: 'insert',
			index: 0,
			blockHtml: block('N'),
		});
		expect(markers(result)).toEqual(['N', 'A', 'B', 'C']);
	});

	test('a middle index inserts before the block currently at that index', () => {
		const result = applyBlockOpToHtml(THREE_BLOCKS, {
			op: 'insert',
			index: 1,
			blockHtml: block('N'),
		});
		expect(markers(result)).toEqual(['A', 'N', 'B', 'C']);
	});

	test('an index >= length appends instead of throwing', () => {
		const result = applyBlockOpToHtml(THREE_BLOCKS, {
			op: 'insert',
			index: 99,
			blockHtml: block('N'),
		});
		expect(markers(result)).toEqual(['A', 'B', 'C', 'N']);
	});
});

describe('applyBlockOpToHtml replace', () => {
	test('swaps the block at index and keeps the neighbours', () => {
		const result = applyBlockOpToHtml(THREE_BLOCKS, {
			op: 'replace',
			index: 1,
			blockHtml: block('R'),
		});
		expect(markers(result)).toEqual(['A', 'R', 'C']);
	});

	test('an out-of-range index throws RangeError', () => {
		expect(() =>
			applyBlockOpToHtml(THREE_BLOCKS, {
				op: 'replace',
				index: 3,
				blockHtml: block('R'),
			}),
		).toThrow(RangeError);
	});
});

describe('applyBlockOpToHtml delete', () => {
	test('removes only the block at index', () => {
		const result = applyBlockOpToHtml(THREE_BLOCKS, { op: 'delete', index: 1 });
		expect(markers(result)).toEqual(['A', 'C']);
	});

	test('an out-of-range index throws RangeError', () => {
		expect(() => applyBlockOpToHtml(THREE_BLOCKS, { op: 'delete', index: 5 })).toThrow(
			RangeError,
		);
	});
});

describe('applyBlockOpToHtml move', () => {
	test('`to` is the index in the final list: move(0, 2) on [A,B,C] gives [B,C,A]', () => {
		const result = applyBlockOpToHtml(THREE_BLOCKS, { op: 'move', from: 0, to: 2 });
		expect(markers(result)).toEqual(['B', 'C', 'A']);
	});

	test('move(2, 0) brings the last block to the front', () => {
		const result = applyBlockOpToHtml(THREE_BLOCKS, { op: 'move', from: 2, to: 0 });
		expect(markers(result)).toEqual(['C', 'A', 'B']);
	});

	test('`to` >= length appends', () => {
		const result = applyBlockOpToHtml(THREE_BLOCKS, { op: 'move', from: 0, to: 99 });
		expect(markers(result)).toEqual(['B', 'C', 'A']);
	});

	test('from === to leaves the order unchanged', () => {
		const result = applyBlockOpToHtml(THREE_BLOCKS, { op: 'move', from: 1, to: 1 });
		expect(markers(result)).toEqual(['A', 'B', 'C']);
	});

	test('an out-of-range `from` throws RangeError', () => {
		expect(() =>
			applyBlockOpToHtml(THREE_BLOCKS, { op: 'move', from: 7, to: 0 }),
		).toThrow(RangeError);
	});
});

describe('applyBlockOpToHtml duplicate', () => {
	test('inserts the clone right after the source', () => {
		const result = applyBlockOpToHtml(THREE_BLOCKS, { op: 'duplicate', index: 0 });
		expect(markers(result)).toEqual(['A', 'A', 'B', 'C']);
	});

	test('strips the id from the clone so the source stays the only #hero', () => {
		const html = block('A', 'hero') + block('B');
		const result = applyBlockOpToHtml(html, { op: 'duplicate', index: 0 }) as string;
		expect(result.match(/id="hero"/g)).toHaveLength(1);
		expect(markers(result)).toEqual(['A', 'A', 'B']);
	});

	test('an out-of-range index throws RangeError', () => {
		expect(() => applyBlockOpToHtml(THREE_BLOCKS, { op: 'duplicate', index: 3 })).toThrow(
			RangeError,
		);
	});
});

describe('applyBlockOpToHtml update-item', () => {
	test('merges data into the item and re-serializes the block in place', () => {
		const result = applyBlockOpToHtml(THREE_BLOCKS, {
			op: 'update-item',
			index: 1,
			itemIndex: 0,
			data: { wysiwyg: '<p>B2</p>' },
		});
		expect(markers(result)).toEqual(['A', 'B2', 'C']);
	});

	test('an out-of-range block index throws RangeError', () => {
		expect(() =>
			applyBlockOpToHtml(THREE_BLOCKS, {
				op: 'update-item',
				index: 3,
				itemIndex: 0,
				data: {},
			}),
		).toThrow(RangeError);
	});

	test('an out-of-range item index throws RangeError', () => {
		expect(() =>
			applyBlockOpToHtml(THREE_BLOCKS, {
				op: 'update-item',
				index: 0,
				itemIndex: 1,
				data: {},
			}),
		).toThrow(RangeError);
	});
});

describe('applyBlockOpToHtml update-item on an image item', () => {
	// The same normalization the editor applies on save (an empty media of the
	// second image is filled in) must apply to an agent's update-item as well.
	const imageBlock =
		'<div data-bge-name="image" data-bge-container="grid:1">' +
		'<div data-bge-container-frame><div data-bge-group><div data-bge-item>' +
		`<div data-bgi="image" data-bgi-ver="0.0.0">${items['image']!.template}</div>` +
		'</div></div></div></div>';
	const secondImage = {
		path: ['/img/pc.png', '/img/sp.png'],
		width: [400, 300],
		height: [300, 200],
		media: ['', ''],
	};

	test('fills the empty media of the second image with the default media query', () => {
		const result = applyBlockOpToHtml(imageBlock, {
			op: 'update-item',
			index: 0,
			itemIndex: 0,
			data: secondImage,
		}) as string;

		expect(result).toContain('media="(max-width: 767px)"');
	});

	test('uses the first entry of the given config.mediaQueries', () => {
		const result = applyBlockOpToHtml(
			imageBlock,
			{ op: 'update-item', index: 0, itemIndex: 0, data: secondImage },
			{ mediaQueries: ['(max-width: 599px)'] },
		) as string;

		expect(result).toContain('media="(max-width: 599px)"');
	});

	test('keeps a media query that was supplied', () => {
		const result = applyBlockOpToHtml(imageBlock, {
			op: 'update-item',
			index: 0,
			itemIndex: 0,
			data: { ...secondImage, media: ['', '(min-width: 1024px)'] },
		}) as string;

		expect(result).toContain('media="(min-width: 1024px)"');
		expect(result).not.toContain('media="(max-width: 767px)"');
	});
});

describe('insert / replace with raw block HTML that has an image with an empty media', () => {
	// `page_update`'s insert / replace save HTML the agent wrote, with no item
	// data in between. An empty `media` would make the second image show on a
	// wide screen too, so the same normalization the editor applies runs on the
	// items found in that HTML.
	const rawImageBlock = (media: string[]) =>
		'<div data-bge-name="image" data-bge-container="grid:1">' +
		'<div data-bge-container-frame><div data-bge-group><div data-bge-item>' +
		`<div data-bgi="image" data-bgi-ver="0.0.0">${itemImport(items['image']!.template, {
			path: ['/img/pc.png', '/img/sp.png'],
			width: [400, 300],
			height: [300, 200],
			media,
			alt: ['説明'],
			loading: ['eager'],
		})}</div>` +
		'</div></div></div></div>';

	test('insert fills the empty media with the default media query', () => {
		const result = applyBlockOpToHtml(THREE_BLOCKS, {
			op: 'insert',
			index: 1,
			blockHtml: rawImageBlock(['', '']),
		}) as string;

		expect(result).toContain('media="(max-width: 767px)"');
		expect(result).not.toContain('media=""');
	});

	test('replace fills it with the first entry of the given config.mediaQueries', () => {
		const result = applyBlockOpToHtml(
			THREE_BLOCKS,
			{ op: 'replace', index: 0, blockHtml: rawImageBlock(['', '']) },
			{ mediaQueries: ['(max-width: 599px)'] },
		) as string;

		expect(result).toContain('media="(max-width: 599px)"');
	});

	test('a media query that was written is kept', () => {
		const result = applyBlockOpToHtml(THREE_BLOCKS, {
			op: 'insert',
			index: 0,
			blockHtml: rawImageBlock(['', '(min-width: 1024px)']),
		}) as string;

		expect(result).toContain('media="(min-width: 1024px)"');
		expect(result).not.toContain('media="(max-width: 767px)"');
	});
});

describe('normalizeBlockOp', () => {
	const rawImageBlock =
		'<div data-bge-name="image" data-bge-container="grid:1">' +
		'<div data-bge-container-frame><div data-bge-group><div data-bge-item>' +
		`<div data-bgi="image" data-bgi-ver="0.0.0">${itemImport(items['image']!.template, {
			path: ['/img/pc.png', '/img/sp.png'],
			width: [400, 300],
			height: [300, 200],
			media: ['', ''],
		})}</div>` +
		'</div></div></div></div>';

	test('does not parse a block whose items have no normalization (a text-only block)', () => {
		const parse = vi.spyOn(DOMParser.prototype, 'parseFromString');
		try {
			const op = { op: 'insert', index: 0, blockHtml: THREE_BLOCKS } as const;

			expect(normalizeBlockOp(op)).toBe(op);
			expect(parse).not.toHaveBeenCalled();
		} finally {
			parse.mockRestore();
		}
	});

	test('still normalizes an item whose name is written in a different case or spacing', () => {
		const op = normalizeBlockOp({
			op: 'insert',
			index: 0,
			blockHtml: rawImageBlock.replace('data-bgi="image"', 'DATA-BGI = "image"'),
		}) as { blockHtml: string };

		expect(op.blockHtml).toContain('media="(max-width: 767px)"');
	});

	test('still normalizes an item whose name is written with character references', () => {
		const op = normalizeBlockOp({
			op: 'insert',
			index: 0,
			// The only "image" in this HTML is the character-referenced item name
			blockHtml: rawImageBlock
				.replace('data-bgi="image"', 'data-bgi="&#105;mage"')
				.replace('data-bge-name="image"', 'data-bge-name="photo"'),
		}) as { blockHtml: string };

		expect(op.blockHtml).toContain('media="(max-width: 767px)"');
	});

	test.each(['insert', 'replace'] as const)(
		'rewrites the blockHtml of a %s op',
		(kind) => {
			const op = normalizeBlockOp({ op: kind, index: 0, blockHtml: rawImageBlock });

			expect(op).toMatchObject({ op: kind, index: 0 });
			expect((op as { blockHtml: string }).blockHtml).toContain(
				'media="(max-width: 767px)"',
			);
		},
	);

	test('returns the same op when nothing needs normalizing, so the HTML the agent wrote is not re-serialized', () => {
		const insertOp = { op: 'insert', index: 0, blockHtml: block('X') } as const;
		const noMediaChange = {
			op: 'insert',
			index: 0,
			blockHtml: rawImageBlock.replaceAll('media=""', 'media="(min-width: 768px)"'),
		} as const;

		expect(normalizeBlockOp(insertOp)).toBe(insertOp);
		expect(normalizeBlockOp(noMediaChange)).toBe(noMediaChange);
	});

	test.each([
		{ op: 'delete', index: 0 },
		{ op: 'move', from: 0, to: 1 },
		{ op: 'duplicate', index: 0 },
		{ op: 'set-id', index: 0, id: 'a' },
		{ op: 'update-item', index: 0, itemIndex: 0, data: {} },
	] as const)('does not touch a $op op', (op) => {
		expect(normalizeBlockOp(op)).toBe(op);
	});

	test("fills a carousel slide's empty media when it has a second image", () => {
		// Each carousel slide holds its images in a `<picture>` list nested in the
		// slide list, so they are read back as one array of images per slide.
		const rawCarouselBlock =
			'<div data-bge-name="carousel" data-bge-container="grid:1">' +
			'<div data-bge-container-frame><div data-bge-group><div data-bge-item>' +
			`<div data-bgi="carousel" data-bgi-ver="0.0.0">${itemImport(
				items['carousel']!.template,
				{
					path: [['/img/pc.png', '/img/sp.png']],
					alt: [['説明']],
					media: [['', '']],
					width: [[400, 300]],
					height: [[300, 200]],
				},
			)}</div>` +
			'</div></div></div></div>';

		const op = normalizeBlockOp(
			{ op: 'insert', index: 0, blockHtml: rawCarouselBlock },
			{ mediaQueries: ['(max-width: 599px)'] },
		) as { blockHtml: string };

		expect(op.blockHtml).toContain('media="(max-width: 599px)"');
	});

	test('leaves an item this project does not define as it is', () => {
		const unknownItem = {
			op: 'insert',
			index: 0,
			blockHtml:
				'<div data-bge-name="custom" data-bge-container="grid:1"><div data-bge-container-frame><div data-bge-group><div data-bge-item>' +
				'<div data-bgi="unknown-item" data-bgi-ver="1.0.0"><p data-bge="body">x</p></div>' +
				'</div></div></div></div>',
		} as const;

		expect(normalizeBlockOp(unknownItem)).toBe(unknownItem);
	});

	test('normalizes every block in the HTML, and keeps what is between and around them', () => {
		const blockHtml = `<!-- note -->${block('A')}\n${rawImageBlock}${block('B')}`;

		const op = normalizeBlockOp({ op: 'insert', index: 0, blockHtml }) as {
			blockHtml: string;
		};

		expect(op.blockHtml).toContain('media="(max-width: 767px)"');
		expect(op.blockHtml).toContain('<!-- note -->');
		expect(op.blockHtml.indexOf('<p>A</p>')).toBeLessThan(
			op.blockHtml.indexOf('<picture'),
		);
		expect(op.blockHtml.indexOf('<picture')).toBeLessThan(
			op.blockHtml.indexOf('<p>B</p>'),
		);
	});

	test('leaves HTML with nothing to normalize as it is', () => {
		const twoRoots = {
			op: 'insert',
			index: 0,
			blockHtml: block('A') + block('B'),
		} as const;
		const notABlock = { op: 'insert', index: 0, blockHtml: '<p>text</p>' } as const;
		const empty = { op: 'insert', index: 0, blockHtml: '' } as const;

		expect(normalizeBlockOp(twoRoots)).toBe(twoRoots);
		expect(normalizeBlockOp(notABlock)).toBe(notABlock);
		expect(normalizeBlockOp(empty)).toBe(empty);
	});
});

describe('applyBlockOpToHtml update-item on an image item', () => {
	test('writes loading on the <img> (jsdom does not implement the loading property)', () => {
		const imageBlock =
			'<div data-bge-name="image" data-bge-container="grid:1">' +
			'<div data-bge-container-frame><div data-bge-group><div data-bge-item>' +
			`<div data-bgi="image" data-bgi-ver="0.0.0">${items['image']!.template}</div>` +
			'</div></div></div></div>';

		const result = applyBlockOpToHtml(imageBlock, {
			op: 'update-item',
			index: 0,
			itemIndex: 0,
			data: { loading: ['eager'] },
		}) as string;

		expect(result).toContain('loading="eager"');
		expect(result).not.toContain('loading="lazy"');
	});
});

describe('applyBlockOpToHtml update-item on a carousel item', () => {
	const carouselBlock =
		'<div data-bge-name="carousel" data-bge-container="grid:1">' +
		'<div data-bge-container-frame><div data-bge-group><div data-bge-item>' +
		`<div data-bgi="carousel" data-bgi-ver="0.0.0">${items['carousel']!.template}</div>` +
		'</div></div></div></div>';

	test("fills the empty media of a slide that is given a second image with the project's mediaQueries", () => {
		const result = applyBlockOpToHtml(
			carouselBlock,
			{
				op: 'update-item',
				index: 0,
				itemIndex: 0,
				data: {
					path: [['/img/pc.png', '/img/sp.png']],
					width: [[400, 300]],
					height: [[300, 200]],
				},
			},
			{ mediaQueries: ['(max-width: 599px)'] },
		) as string;

		expect(result).toContain('media="(max-width: 599px)"');
	});

	test('keeps an <img> in every slide when the agent sends a flat path like the image item', () => {
		const result = applyBlockOpToHtml(carouselBlock, {
			op: 'update-item',
			index: 0,
			itemIndex: 0,
			data: { path: ['/img/a.png', '/img/b.png'] },
		}) as string;

		const doc = new DOMParser().parseFromString(result, 'text/html');
		const figures = [...doc.querySelectorAll('figure')];
		expect(figures.map((f) => f.querySelector('img')?.getAttribute('src'))).toStrictEqual(
			['/img/a.png', '/img/b.png'],
		);
		expect(doc.querySelector('source')).toBeNull();
	});
});

describe('applyBlockOpToHtml set-id', () => {
	test('sets the id attribute on the block root', () => {
		const result = applyBlockOpToHtml(THREE_BLOCKS, {
			op: 'set-id',
			index: 2,
			id: 'contact',
		}) as string;
		expect(result).toContain(
			'data-bge-container="grid:1" id="contact"><div data-bge-container-frame',
		);
		expect(result.match(/id="contact"/g)).toHaveLength(1);
		expect(markers(result)).toEqual(['A', 'B', 'C']);
	});

	test('overwrites an existing id', () => {
		const html = block('A', 'hero');
		const result = applyBlockOpToHtml(html, {
			op: 'set-id',
			index: 0,
			id: 'intro',
		}) as string;
		expect(result).toContain('id="intro"');
		expect(result).not.toContain('id="hero"');
	});

	test('an out-of-range index throws RangeError', () => {
		expect(() =>
			applyBlockOpToHtml(THREE_BLOCKS, { op: 'set-id', index: 9, id: 'x' }),
		).toThrow(RangeError);
	});
});

describe('applyBlockOpToHtml on an empty editable area', () => {
	test('insert into an empty string yields exactly the new block', () => {
		const result = applyBlockOpToHtml('', {
			op: 'insert',
			index: 0,
			blockHtml: block('N'),
		});
		expect(markers(result)).toEqual(['N']);
	});

	test('delete on an empty string throws RangeError (length=0)', () => {
		expect(() => applyBlockOpToHtml('', { op: 'delete', index: 0 })).toThrow(
			'Block index 0 out of range (length=0)',
		);
	});
});
