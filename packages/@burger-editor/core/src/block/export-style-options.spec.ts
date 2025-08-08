import { test, expect } from 'vitest';

import { exportStyleOptions } from './export-style-options.js';

test('スタイルオプションの取得', () => {
	const el = document.createElement('div');
	el.style.setProperty('--bge-options-width', 'var(--bge-options-width--full)');
	el.style.setProperty('--bge-options-bgcolor', 'var(--bge-options-bgcolor--blue)');
	el.style.setProperty(
		'--bge-options-padding-block',
		'var(--bge-options-padding-block--middle)',
	);
	el.style.setProperty(
		'--bge-options-padding-inline',
		'var(--bge-options-padding-inline--large)',
	);

	expect(exportStyleOptions(el)).toEqual({
		width: 'full',
		bgcolor: 'blue',
		'padding-block': 'middle',
		'padding-inline': 'large',
	});
});
