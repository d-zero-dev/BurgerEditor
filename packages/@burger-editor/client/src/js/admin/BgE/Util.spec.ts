import { describe, test, expect } from 'vitest';

import Util from './Util.js';

describe('Util', () => {
	test('Util.base64encode', () => {
		expect(Util.base64encode('test')).toBe('dGVzdA==');
		expect(Util.base64encode('こんにちは😀')).toBe('44GT44KT44Gr44Gh44Gv8J+YgA==');
	});

	test('Util.base64decode', () => {
		expect(Util.base64decode('dGVzdA==')).toBe('test');
		expect(Util.base64decode('44GT44KT44Gr44Gh44Gv8J+YgA==')).toBe('こんにちは😀');
	});
});
