import { describe, expect, test } from 'vitest';

import {
	WildcardHostError,
	assertConnectableHost,
	canonicalHostname,
	isLoopbackHost,
	toUrlHost,
} from './host.js';

describe('toUrlHost', () => {
	test.each([
		['localhost', 'localhost'],
		['192.0.2.10', '192.0.2.10'],
		['::1', '[::1]'],
		['2001:db8::1', '[2001:db8::1]'],
		['[::1]', '[::1]'],
	])('%s → %s', (host, expected) => {
		expect(toUrlHost(host)).toBe(expected);
	});

	test('the result forms a URL that parses (regression: #1001)', () => {
		expect(new URL(`http://${toUrlHost('::1')}:5255`).port).toBe('5255');
	});
});

describe('canonicalHostname', () => {
	test.each([
		['localhost', 'localhost'],
		['2001:DB8:0:0::1', '[2001:db8::1]'],
		['0', '0.0.0.0'],
	])('%s → %s', (host, expected) => {
		expect(canonicalHostname(host)).toBe(expected);
	});

	test('returns null instead of throwing for a host no URL can carry (IPv6 zone ID)', () => {
		expect(canonicalHostname('fe80::1%en0')).toBeNull();
	});
});

describe('isLoopbackHost', () => {
	test.each(['localhost', '127.0.0.1', '::1', '0:0:0:0:0:0:0:1', '[::1]'])(
		'%s is loopback',
		(host) => {
			expect(isLoopbackHost(host)).toBe(true);
		},
	);

	test.each(['192.0.2.10', '2001:db8::1'])('%s is not loopback', (host) => {
		expect(isLoopbackHost(host)).toBe(false);
	});
});

describe('assertConnectableHost', () => {
	test.each(['0.0.0.0', '0', '::', '0:0:0:0:0:0:0:0', '::0', '::ffff:0.0.0.0'])(
		'rejects the wildcard %s with WildcardHostError (regression: #1001)',
		(host) => {
			expect(() => assertConnectableHost(host)).toThrow(WildcardHostError);
		},
	);

	test.each([
		'localhost',
		'127.0.0.1',
		'::1',
		'192.0.2.10',
		'2001:db8::1',
		'fe80::1%en0',
	])('accepts the non-wildcard host %s', (host) => {
		expect(() => assertConnectableHost(host)).not.toThrow();
	});

	test('the 0.0.0.0 message names the host, says why it is rejected and what to set instead', () => {
		expect(() => assertConnectableHost('0.0.0.0')).toThrow(
			expect.objectContaining({
				message: expect.stringMatching(
					/Invalid host "0\.0\.0\.0"[\s\S]*listen on every network interface[\s\S]*cannot be opened: Chrome and Safari block requests to 0\.0\.0\.0\.[\s\S]*Set host to "localhost"[\s\S]*LAN IP address/,
				),
			}),
		);
	});

	test('the :: message gives the IPv6 reason, not the 0.0.0.0 one', () => {
		expect(() => assertConnectableHost('::')).toThrow(
			expect.objectContaining({
				message: expect.stringMatching(
					/Invalid host "::"[\s\S]*cannot be opened: "::" \(the IPv6 "any" address\) is not an address a browser can connect to\./,
				),
			}),
		);
	});
});
