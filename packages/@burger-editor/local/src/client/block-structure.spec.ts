import { describe, expect, test } from 'vitest';

import { hasBlockStructureChanged } from './block-structure.js';

/**
 * @param name
 * @param text
 */
function block(name: string, text: string) {
	return (
		`<div data-bge-name="${name}" data-bge-container="grid:1">` +
		'<div data-bge-container-frame=""><div data-bge-group=""><div data-bge-item="">' +
		`<div data-bgi="wysiwyg" data-bgi-ver="1.0.0"><div data-bge="wysiwyg"><p>${text}</p></div></div>` +
		'</div></div></div></div>'
	);
}

describe('hasBlockStructureChanged', () => {
	test('is false when only whitespace and formatting differ', () => {
		const loaded = `\n\t${block('text', 'a')}\n\t${block('image', 'b')}\n`;
		const normalized = `${block('text', 'a')}${block('image', 'b')}`;

		expect(hasBlockStructureChanged(loaded, normalized)).toBe(false);
	});

	test('is true when raw HTML was wrapped into a block', () => {
		expect(hasBlockStructureChanged('<p>raw</p>', block('wysiwyg', 'raw'))).toBe(true);
	});

	test('is true when raw HTML next to a block was wrapped, shifting indices', () => {
		const loaded = `<p>raw</p>${block('text', 'a')}`;
		const normalized = `${block('wysiwyg', 'raw')}${block('text', 'a')}`;

		expect(hasBlockStructureChanged(loaded, normalized)).toBe(true);
	});

	test('is true when the block names differ in order', () => {
		const loaded = `${block('text', 'a')}${block('image', 'b')}`;
		const normalized = `${block('image', 'b')}${block('text', 'a')}`;

		expect(hasBlockStructureChanged(loaded, normalized)).toBe(true);
	});

	test('is false for two empty areas', () => {
		expect(hasBlockStructureChanged('\n', '')).toBe(false);
	});
});
