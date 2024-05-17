import { test, expect } from 'vitest';

import FrozenPatty from './index.js';

test('constructor', () => {
	const fp = FrozenPatty('<div data-field="text">value</div>');
	expect(fp.toHTML()).toBe('<div data-field="text">value</div>');
});
