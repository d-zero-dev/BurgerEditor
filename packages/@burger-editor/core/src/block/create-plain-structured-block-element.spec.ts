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

test('with id, classList, and style options', async () => {
	const el = await createPlainStructuredBlockElement(
		{
			name: 'custom-text',
			containerProps: {
				type: 'inline',
				justify: 'center',
			},
			id: 'my-custom-block',
			classList: ['custom-class', 'another-class'],
			style: {
				'max-width': 'large',
				'bg-color': 'blue',
				'padding-block': 'middle',
			},
			items: [['wysiwyg']],
		},
		createItemElement,
	);

	// コンテナ要素の確認（idにはbge-プレフィックスが付く）
	expect(el.id).toBe('bge-my-custom-block');
	expect(el.classList.contains('custom-class')).toBe(true);
	expect(el.classList.contains('another-class')).toBe(true);
	expect(el.style.getPropertyValue('--bge-options-max-width')).toBe(
		'var(--bge-options-max-width--large)',
	);
	expect(el.style.getPropertyValue('--bge-options-bg-color')).toBe(
		'var(--bge-options-bg-color--blue)',
	);
	expect(el.style.getPropertyValue('--bge-options-padding-block')).toBe(
		'var(--bge-options-padding-block--middle)',
	);

	// コンテナプロパティの確認
	expect(el.dataset.bgeContainer).toBe('inline:center');
	expect(el.dataset.bgeName).toBe('custom-text');
});

test('with partial options', async () => {
	const el = await createPlainStructuredBlockElement(
		{
			name: 'partial-test',
			containerProps: {
				type: 'grid',
				columns: 3,
			},
			classList: ['only-class'],
			items: [['image']],
		},
		createItemElement,
	);

	// 指定されたもののみ設定される
	expect(el.id).toBe('');
	expect(el.classList.contains('only-class')).toBe(true);
	expect(el.style.getPropertyValue('--bge-options-max-width')).toBe('');
	expect(el.dataset.bgeContainer).toBe('grid:3');
});

test('with empty style options', async () => {
	const el = await createPlainStructuredBlockElement(
		{
			name: 'empty-style',
			containerProps: {
				type: 'float',
				float: 'start',
			},
			style: {},
			items: [['wysiwyg']],
		},
		createItemElement,
	);

	// 空のstyleオプションでもエラーにならない
	expect(el.style.length).toBe(0);
	expect(el.dataset.bgeContainer).toBe('float:start');
});
