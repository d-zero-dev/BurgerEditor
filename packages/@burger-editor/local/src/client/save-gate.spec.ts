import { describe, expect, test } from 'vitest';

import { createSaveGate } from './save-gate.js';

const BLOCK =
	'<div data-bge-name="wysiwyg" data-bge-container="grid:1"><div data-bge-container-frame="">' +
	'<div data-bge-group=""><div data-bge-item=""><div data-bgi="wysiwyg" data-bgi-ver="1.0.0">' +
	'<div data-bge="wysiwyg"><p>raw</p></div></div></div></div></div></div>';

describe('createSaveGate — opening a page', () => {
	test('an update before ready() is not posted', () => {
		const gate = createSaveGate({ isNewFile: false });

		expect(gate.shouldPost('<p>raw</p>', BLOCK)).toBe(false);
	});

	test('an update after ready() is posted', () => {
		const gate = createSaveGate({ isNewFile: false });
		gate.ready();

		expect(gate.shouldPost(BLOCK, `${BLOCK}${BLOCK}`)).toBe(true);
	});

	test('keeps the content as normalizedOnOpen when the update before ready() changed the block list', () => {
		const gate = createSaveGate({ isNewFile: false });

		gate.shouldPost('<p>raw</p>', BLOCK);

		expect(gate.normalizedOnOpen).toBe(BLOCK);
	});

	test('leaves normalizedOnOpen undefined when the update before ready() only reformatted the blocks', () => {
		const gate = createSaveGate({ isNewFile: false });

		gate.shouldPost(`\n\t${BLOCK}\n`, BLOCK);

		expect(gate.normalizedOnOpen).toBeUndefined();
	});

	test('an update after ready() never sets normalizedOnOpen', () => {
		const gate = createSaveGate({ isNewFile: false });
		gate.ready();

		gate.shouldPost('<p>raw</p>', BLOCK);

		expect(gate.normalizedOnOpen).toBeUndefined();
	});
});

describe('createSaveGate — createIfMissing', () => {
	test('is true for a page that did not exist when it was opened', () => {
		expect(createSaveGate({ isNewFile: true }).createIfMissing).toBe(true);
	});

	test('is false for a page that existed when it was opened', () => {
		expect(createSaveGate({ isNewFile: false }).createIfMissing).toBe(false);
	});

	test('stays true after a failed save', () => {
		const gate = createSaveGate({ isNewFile: true });

		gate.recordSave(false);

		expect(gate.createIfMissing).toBe(true);
	});

	test('turns false after the first successful save', () => {
		const gate = createSaveGate({ isNewFile: true });

		gate.recordSave(true);

		expect(gate.createIfMissing).toBe(false);
	});
});
