import { test, expect } from 'vitest';

import { stringifyField, stringifyFields } from './stringify-fields.js';

test('stringify field name', () => {
	expect(stringifyField('text')).toBe('text');
	expect(stringifyField('path', 'src')).toBe('path:src');
	expect(stringifyField('href', 'href')).toBe(':href'); // shorthand notation
});

test('join field names', () => {
	expect(
		stringifyFields([
			{ fieldName: 'path', propName: 'src' },
			{ fieldName: 'alt' },
			{ fieldName: 'href', propName: 'href' },
		]),
	).toBe('path:src, alt, :href');
});
