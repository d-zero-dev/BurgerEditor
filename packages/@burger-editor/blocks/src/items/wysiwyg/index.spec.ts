import type { ItemSeed } from '@burger-editor/core';

import { render } from '@burger-editor/core';
import { test, expect } from 'vitest';

import wysiwyg from './index.js';

const items = { wysiwyg } as unknown as Record<string, ItemSeed>;

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
						name: 'wysiwyg',
						data: {
							wysiwyg: 'replaceable text',
						},
					},
				],
			],
		},
		{ items },
	);

	expect(el.outerHTML.split(/(?<=>)\s*(?=<)/)).toEqual([
		'<div data-bge-name="text" data-bge-container="grid:2">',
		'<div data-bge-container-frame="">',
		'<div data-bge-group="">',
		'<div data-bge-item="">',
		`<div data-bgi="wysiwyg" data-bgi-ver="${__VERSION__}">`,
		'<div data-bge="wysiwyg">replaceable text</div>',
		'</div>',
		'</div>',
		'</div>',
		'</div>',
		'</div>',
	]);
});
