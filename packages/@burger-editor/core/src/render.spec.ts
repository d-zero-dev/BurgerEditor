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
					editor: '',
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
