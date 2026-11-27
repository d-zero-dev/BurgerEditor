import { describe, expect, it } from 'vitest';

import { compareVersions } from './compare-versions.mjs';

describe('compareVersions', () => {
	it('orders a stable release above its prereleases', () => {
		expect(compareVersions('3.5.0', '3.5.0-alpha.3')).toBeGreaterThan(0);
	});

	it('orders prerelease numbers numerically', () => {
		expect(compareVersions('4.0.0-alpha.10', '4.0.0-alpha.9')).toBeGreaterThan(0);
		expect(compareVersions('4.0.0-alpha.9', '4.0.0-alpha.10')).toBeLessThan(0);
	});

	it('orders alpha below beta below rc below the stable release', () => {
		expect(compareVersions('4.0.0-beta.1', '4.0.0-alpha.77')).toBeGreaterThan(0);
		expect(compareVersions('4.0.0-alpha.77', '4.0.0-beta.1')).toBeLessThan(0);
		expect(compareVersions('4.0.0-rc.1', '4.0.0-beta.9')).toBeGreaterThan(0);
		expect(compareVersions('4.0.0', '4.0.0-rc.1')).toBeGreaterThan(0);
		expect(compareVersions('4.0.0-rc.1', '4.0.0')).toBeLessThan(0);
	});

	it('orders a shorter prerelease below a longer one with the same start', () => {
		expect(compareVersions('4.0.0-alpha', '4.0.0-alpha.1')).toBeLessThan(0);
		expect(compareVersions('4.0.0-alpha.1', '4.0.0-alpha')).toBeGreaterThan(0);
	});

	it('orders a numeric identifier below an alphanumeric one', () => {
		expect(compareVersions('4.0.0-1', '4.0.0-alpha')).toBeLessThan(0);
		expect(compareVersions('4.0.0-alpha', '4.0.0-1')).toBeGreaterThan(0);
	});

	it('finds equal versions equal', () => {
		expect(compareVersions('v4.0.0-alpha.1', '4.0.0-alpha.1')).toBe(0);
		expect(compareVersions('3.5.0', '3.5.0')).toBe(0);
	});

	it('orders by the numeric core first', () => {
		expect(compareVersions('3.10.0', '3.9.9')).toBeGreaterThan(0);
	});
});
