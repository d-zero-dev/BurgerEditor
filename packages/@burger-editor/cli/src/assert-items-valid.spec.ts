// dom-shim side-effect — must come before anything that touches DOMParser.
import '@burger-editor/file-io';

import { items } from '@burger-editor/blocks';
import { itemImport, withConfigDefaults } from '@burger-editor/core';
import { describe, expect, test } from 'vitest';

import { assertItemsValid } from './assert-items-valid.js';

const config = withConfigDefaults({});

/**
 * A `[data-bgi]` wrapper holding the image item rendered from `data`.
 * @param data
 */
function imageWrapper(data: Record<string, unknown>): HTMLElement {
	const el = document.createElement('div');
	el.dataset.bgi = 'image';
	el.innerHTML = itemImport(items['image']!.template, data);
	return el;
}

const namedLink = {
	path: ['/img/a.png'],
	alt: ['詳細'],
	node: 'a',
	href: 'https://example.com/',
};
const unnamedLink = { ...namedLink, alt: [''] };

describe('assertItemsValid', () => {
	test('does nothing for items that may be saved, and for no items at all', () => {
		expect(() => assertItemsValid([], config)).not.toThrow();
		expect(() =>
			assertItemsValid(
				[imageWrapper(namedLink), imageWrapper({ path: ['/a.png'], alt: [''] })],
				config,
			),
		).not.toThrow();
	});

	test('names the item by its 0-based position in the block and by its name, then gives the reason', () => {
		expect(() =>
			assertItemsValid([imageWrapper(namedLink), imageWrapper(unnamedLink)], config),
		).toThrow(
			/^Nothing was written\. item index 1 \("image"\): 代替テキスト\(alt\)が空です/,
		);
	});

	test('lists every item that must not be saved, in one message, not only the first', () => {
		let message = '';
		try {
			assertItemsValid([imageWrapper(unnamedLink), imageWrapper(unnamedLink)], config);
		} catch (error) {
			message = (error as Error).message;
		}

		expect(message).toContain('item index 0 ("image")');
		expect(message).toContain('item index 1 ("image")');
	});

	test('does not check an item that the standard items do not define', () => {
		const custom = document.createElement('div');
		custom.dataset.bgi = 'my-own-item';
		custom.innerHTML = '<a href="https://example.com/"><img src="/a.png" alt=""></a>';
		const prototypeName = document.createElement('div');
		prototypeName.dataset.bgi = 'constructor';

		expect(() => assertItemsValid([custom, prototypeName], config)).not.toThrow();
	});
});
