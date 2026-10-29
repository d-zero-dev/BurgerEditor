import { describe, expect, test } from 'vitest';

import pkg from '../../../package.json' with { type: 'json' };

import { version } from './BgE.js';

describe('version', () => {
	test('package.json の version と一致する', () => {
		expect(version).toBe(pkg.version);
	});
});
