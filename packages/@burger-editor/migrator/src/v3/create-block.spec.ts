import { describe, expect, test } from 'vitest';

import { createBlock } from './create-block.js';

describe('createBlock', () => {
	test('should create block', () => {
		const block = createBlock('title', [
			{
				titleH2: 'タイトル',
			},
		]);
		expect(block).toBe(`<div data-bgb="title" class="bgb-title">
	<div data-bgt="title-h2" data-bgt-ver="2.1.0" class="bgt-container bgt-title-h2-container"><h2 class="bge-title-h2" data-bge="title-h2">タイトル</h2></div>
</div>`);
	});
});
