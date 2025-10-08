import type { CreateItemElement } from './types.js';

import { test, expect } from 'vitest';

import { createPlainStructuredBlockElement } from './create-plain-structured-block-element.js';

const createItemElement: CreateItemElement = (item) => {
	const itemName =
		typeof item === 'string' ? item : 'localName' in item ? item.dataset.bgi : item.name;
	const itemEl = document.createElement('span');
	itemEl.innerHTML = `<!-- ${itemName} -->`;
	return itemEl;
};

test('one item', async () => {
	const el = await createPlainStructuredBlockElement(
		{
			name: 'text',
			containerProps: {
				type: 'grid',
				columns: 2,
			},
			items: [['wysiwyg']],
		},
		createItemElement,
	);

	expect(el.outerHTML.split(/(?<=>)(?=<)/)).toEqual([
		'<div data-bge-name="text" data-bge-container="grid:2">',
		'<div data-bge-container-frame="">',
		'<div data-bge-group="">',
		'<div data-bge-item="">',
		'<span>',
		'<!-- wysiwyg -->',
		'</span>',
		'</div>',
		'</div>',
		'</div>',
		'</div>',
	]);
});

test('two items', async () => {
	const el = await createPlainStructuredBlockElement(
		{
			name: 'text',
			containerProps: {
				type: 'grid',
				columns: 2,
			},
			items: [['wysiwyg', 'wysiwyg']],
		},
		createItemElement,
	);

	expect(el.outerHTML.split(/(?<=>)(?=<)/)).toEqual([
		'<div data-bge-name="text" data-bge-container="grid:2">',
		'<div data-bge-container-frame="">',
		'<div data-bge-group="">',
		'<div data-bge-item="">',
		'<span>',
		'<!-- wysiwyg -->',
		'</span>',
		'</div>',
		'<div data-bge-item="">',
		'<span>',
		'<!-- wysiwyg -->',
		'</span>',
		'</div>',
		'</div>',
		'</div>',
		'</div>',
	]);
});

test('two groups', async () => {
	const el = await createPlainStructuredBlockElement(
		{
			name: 'text',
			containerProps: {
				type: 'grid',
				columns: 2,
			},
			items: [
				['wysiwyg', 'image'],
				['wysiwyg', 'image'],
			],
		},
		createItemElement,
	);

	expect(el.outerHTML.split(/(?<=>)(?=<)/)).toEqual([
		'<div data-bge-name="text" data-bge-container="grid:2">',
		'<div data-bge-container-frame="">',
		'<div data-bge-group="">',
		'<div data-bge-item="">',
		'<span>',
		'<!-- wysiwyg -->',
		'</span>',
		'</div>',
		'<div data-bge-item="">',
		'<span>',
		'<!-- image -->',
		'</span>',
		'</div>',
		'</div>',
		'<div data-bge-group="">',
		'<div data-bge-item="">',
		'<span>',
		'<!-- wysiwyg -->',
		'</span>',
		'</div>',
		'<div data-bge-item="">',
		'<span>',
		'<!-- image -->',
		'</span>',
		'</div>',
		'</div>',
		'</div>',
		'</div>',
	]);
});

test('list semantic', async () => {
	const el = await createPlainStructuredBlockElement(
		{
			name: 'list',
			containerProps: {
				type: 'inline',
				frameSemantics: 'ul',
				columns: 2,
			},
			items: [['button'], ['button']],
		},
		createItemElement,
	);

	expect(el.outerHTML.split(/(?<=>)(?=<)/)).toEqual([
		'<div data-bge-name="list" data-bge-container="inline:2:ul">',
		'<ul data-bge-container-frame="">',
		'<li data-bge-group="">',
		'<div data-bge-item="">',
		'<span>',
		'<!-- button -->',
		'</span>',
		'</div>',
		'</li>',
		'<li data-bge-group="">',
		'<div data-bge-item="">',
		'<span>',
		'<!-- button -->',
		'</span>',
		'</div>',
		'</li>',
		'</ul>',
		'</div>',
	]);
});
