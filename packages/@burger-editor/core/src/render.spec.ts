import { test, expect } from 'vitest';

import { render } from './render.js';

test('render', async () => {
	const el = await render(
		{
			name: 'text',
			containerProps: {
				type: 'grid',
				columns: 2,
			},
			items: [
				[
					{
						name: 'text',
						data: {
							text: 'replaceable text',
						},
					},
				],
			],
		},
		{
			items: {
				text: {
					version: '1.0.0',
					style: '',
					name: 'text',
					template: '<div data-bge="text">text</div>',
				},
			},
		},
	);

	expect(el.outerHTML.split(/(?<=>)(?=<)/)).toEqual([
		'<div data-bge-name="text" data-bge-container="grid:2">',
		'<div data-bge-container-frame="">',
		'<div data-bge-group="">',
		'<div data-bge-item="">',
		'<div data-bgi="text" data-bgi-ver="1.0.0">',
		'<div data-bge="text">replaceable text</div>',
		'</div>',
		'</div>',
		'</div>',
		'</div>',
		'</div>',
	]);
});

test('render は、seed の normalizeItemData を config つきで通してから HTML にする', async () => {
	const el = await render(
		{
			name: 'text',
			containerProps: { type: 'grid', columns: 1 },
			items: [[{ name: 'text', data: { text: 'abc' } }]],
		},
		{
			config: {
				classList: [],
				googleMapsApiKey: null,
				sampleImagePath: '',
				sampleFilePath: '',
				stylesheets: [],
				mediaQueries: ['(max-width: 599px)'],
			},
			items: {
				text: {
					version: '1.0.0',
					style: '',
					name: 'text',
					template: '<div data-bge="text">text</div>',
					normalizeItemData: (data: { text?: string }, config) => ({
						...data,
						text: `${data.text}:${config.mediaQueries?.[0]}`,
					}),
				},
			},
		},
	);

	expect(el.querySelector('[data-bge="text"]')?.textContent).toBe(
		'abc:(max-width: 599px)',
	);
});
