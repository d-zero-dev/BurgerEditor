import { describe, expect, it } from 'vitest';

import { getItemParams } from './get-item-params.js';

describe('getItemParams', () => {
	it('should return the item params', () => {
		const itemParams = getItemParams('button');
		expect(itemParams).toStrictEqual([['kind', 'link', 'target', 'text']]);
	});

	it('should return the item params', () => {
		const itemParams = getItemParams('title');
		expect(itemParams).toStrictEqual([['titleH2']]);
	});

	it('should return the item params', () => {
		const itemParams = getItemParams('image3');
		expect(itemParams).toStrictEqual([
			['popup', 'empty', 'hr', 'path', 'srcset', 'alt', 'width', 'height', 'caption'],
			['popup', 'empty', 'hr', 'path', 'srcset', 'alt', 'width', 'height', 'caption'],
			['popup', 'empty', 'hr', 'path', 'srcset', 'alt', 'width', 'height', 'caption'],
		]);
	});
});
