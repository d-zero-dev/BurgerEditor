import { test, expect } from 'vitest';

import { exportStyleOptions } from './export-style-options.js';

test('スタイルオプションの取得', () => {
	const el = document.createElement('div');
	el.style.setProperty('--bge-options-width', 'var(--bge-options-width-full)');
	el.style.setProperty('--bge-options-bgcolor', 'var(--bge-options-bgcolor-blue)');

	expect(exportStyleOptions(el)).toEqual({
		width: 'full',
		bgcolor: 'blue',
	});
});
