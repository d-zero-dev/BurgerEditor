import fs from 'node:fs/promises';
import path from 'node:path';

import { mkdtempDisposable } from '@d-zero/shared/mkdtemp-disposable';
import { afterEach, describe, expect, test } from 'vitest';

import { createAgentAuth, loginUrl } from './auth.js';

describe('createAgentAuth — loopback', () => {
	test.each(['localhost', '127.0.0.1', '::1'])(
		'requires no token when bound to %s',
		async (host) => {
			const auth = await createAgentAuth(host, '/tmp/unused');
			expect(auth.required).toBe(false);
			expect(auth.token).toBeNull();
			expect(auth.verify()).toBe(true);
		},
	);
});

describe('createAgentAuth — non-loopback', () => {
	let tmp: { path: string } & AsyncDisposable;

	afterEach(async () => {
		await tmp?.[Symbol.asyncDispose]();
	});

	test('mints a token and persists it 0600 under <configDir>/.burgereditor/agent-token', async () => {
		tmp = await mkdtempDisposable('bge-auth-');
		const auth = await createAgentAuth('192.168.1.50', tmp.path);
		expect(auth.required).toBe(true);
		expect(auth.token).toMatch(/^[0-9a-f]{48}$/);
		expect(auth.tokenFilePath).toBe(path.join(tmp.path, '.burgereditor', 'agent-token'));

		const written = await fs.readFile(auth.tokenFilePath!, 'utf8');
		expect(written).toBe(auth.token);

		const stat = await fs.stat(auth.tokenFilePath!);
		expect(stat.mode & 0o777).toBe(0o600);
	});

	test('verify accepts a matching cookie or bearer token and rejects everything else', async () => {
		tmp = await mkdtempDisposable('bge-auth-');
		const auth = await createAgentAuth('192.168.1.50', tmp.path);
		expect(auth.verify(auth.token ?? undefined)).toBe(true);
		expect(auth.verify(undefined, auth.token ?? undefined)).toBe(true);
		expect(auth.verify('wrong')).toBe(false);
		expect(auth.verify()).toBe(false);
	});
});

describe('loginUrl', () => {
	test('returns null when auth is not required', () => {
		expect(
			loginUrl('http://192.168.1.50:5255', {
				required: false,
				token: null,
				tokenFilePath: null,
				verify: () => true,
			}),
		).toBeNull();
	});

	test('appends ?token= when auth is required', () => {
		const url = loginUrl('http://192.168.1.50:5255', {
			required: true,
			token: 'abc123',
			tokenFilePath: '/x',
			verify: () => true,
		});
		expect(url).toBe('http://192.168.1.50:5255/?token=abc123');
	});
});
