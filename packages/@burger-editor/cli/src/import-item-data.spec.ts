// dom-shim side-effect — must come before anything that touches DOMParser.
import '@burger-editor/file-io';

import { describe, expect, test } from 'vitest';

import { mayHoldCheckedItem } from './import-item-data.js';

describe('mayHoldCheckedItem', () => {
	test('is false for HTML without any item wrapper (a block of plain text)', () => {
		expect(mayHoldCheckedItem('<p>image carousel</p>')).toBe(false);
	});

	test('is true for HTML that holds an item whose definition normalizes or validates', () => {
		expect(mayHoldCheckedItem('<div data-bgi="image"></div>')).toBe(true);
		expect(mayHoldCheckedItem('<div data-bgi="carousel"></div>')).toBe(true);
	});

	test('does not depend on the case of the item name', () => {
		expect(mayHoldCheckedItem('<DIV DATA-BGI="IMAGE"></DIV>')).toBe(true);
	});

	test('errs on the side of "may" for a name written with character references', () => {
		expect(mayHoldCheckedItem('<div data-bgi="&#105;mage"></div>')).toBe(true);
	});

	test('is false for a wrapper of an item that the standard items do not define', () => {
		expect(mayHoldCheckedItem('<div data-bgi="my-own-item"></div>')).toBe(false);
	});
});
