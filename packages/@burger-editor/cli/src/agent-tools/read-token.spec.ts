// dom-shim side-effect — requireReadToken's recovery peek parses the page with DOMParser.
import '@burger-editor/file-io';

import fs from 'node:fs/promises';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { type AgentToolFixture, makeFixture } from './__tests__/fixture.js';
import { AgentError } from './errors.js';
import {
	decodeReadToken,
	encodeReadToken,
	issueReadToken,
	requireReadToken,
	verifyReadToken,
} from './read-token.js';

let fixture: AgentToolFixture;
let aboutPath: string;

beforeEach(async () => {
	fixture = await makeFixture();
	aboutPath = path.join(fixture.docRoot, 'about.html');
});

afterEach(async () => {
	await fixture.tmp[Symbol.asyncDispose]();
});

describe('decodeReadToken', () => {
	test('round-trips what encodeReadToken produced', () => {
		const token = encodeReadToken({
			path: 'about.html',
			contentHash: '0123456789abcdef',
		});
		expect(decodeReadToken(token)).toEqual({
			path: 'about.html',
			contentHash: '0123456789abcdef',
		});
	});

	test('returns null for a string that is not base64 JSON', () => {
		expect(decodeReadToken('definitely not a token')).toBeNull();
	});

	test('returns null for base64 of non-JSON text', () => {
		expect(decodeReadToken(Buffer.from('hello', 'utf8').toString('base64'))).toBeNull();
	});

	test('returns null for JSON missing contentHash', () => {
		const token = Buffer.from(JSON.stringify({ path: 'about.html' })).toString('base64');
		expect(decodeReadToken(token)).toBeNull();
	});

	test('returns null for JSON missing path', () => {
		const token = Buffer.from(JSON.stringify({ contentHash: 'abcd' })).toString('base64');
		expect(decodeReadToken(token)).toBeNull();
	});

	test('returns null for a JSON scalar', () => {
		expect(decodeReadToken(Buffer.from('42').toString('base64'))).toBeNull();
	});
});

describe('verifyReadToken', () => {
	test('reports missing when the token is undefined', async () => {
		const result = await verifyReadToken(undefined, 'about.html', aboutPath);
		expect(result).toEqual({ ok: false, reason: 'missing' });
	});

	test('reports missing when the token is an empty string', async () => {
		const result = await verifyReadToken('', 'about.html', aboutPath);
		expect(result).toEqual({ ok: false, reason: 'missing' });
	});

	test('reports malformed for a garbage token', async () => {
		const result = await verifyReadToken('garbage', 'about.html', aboutPath);
		expect(result).toEqual({ ok: false, reason: 'malformed' });
	});

	test('reports wrong-path for a token minted for another path string', async () => {
		const token = await issueReadToken('other.html', aboutPath);
		const result = await verifyReadToken(token, 'about.html', aboutPath);
		expect(result).toEqual({ ok: false, reason: 'wrong-path' });
	});

	test('reports stale once the file content changes', async () => {
		const token = await issueReadToken('about.html', aboutPath);
		await fs.appendFile(aboutPath, '\n<!-- edited -->', 'utf8');
		const result = await verifyReadToken(token, 'about.html', aboutPath);
		expect(result).toEqual({ ok: false, reason: 'stale' });
	});

	test('reports stale when only the Front Matter changes', async () => {
		const token = await issueReadToken('about.html', aboutPath);
		const html = await fs.readFile(aboutPath, 'utf8');
		await fs.writeFile(
			aboutPath,
			html.replace("title: 'Test Page'", "title: 'Renamed'"),
			'utf8',
		);
		const result = await verifyReadToken(token, 'about.html', aboutPath);
		expect(result).toEqual({ ok: false, reason: 'stale' });
	});

	test('is ok for a fresh token on an unchanged file', async () => {
		const token = await issueReadToken('about.html', aboutPath);
		const result = await verifyReadToken(token, 'about.html', aboutPath);
		expect(result).toEqual({ ok: true });
	});
});

describe('requireReadToken', () => {
	test('resolves silently for a valid token', async () => {
		const token = await issueReadToken('about.html', aboutPath);
		await expect(
			requireReadToken(fixture.ctx, 'about.html', token),
		).resolves.toBeUndefined();
	});

	test('throws read-required with a fresh readToken and currentBlocks when the token is missing', async () => {
		let missingToken: string | undefined;
		const error = (await requireReadToken(fixture.ctx, 'about.html', missingToken).catch(
			(error_: unknown) => error_,
		)) as AgentError;
		expect(error).toBeInstanceOf(AgentError);
		expect(error.code).toBe('read-required');
		const fresh = await issueReadToken('about.html', aboutPath);
		expect(error.extra.readToken).toBe(fresh);
		expect(error.extra.currentBlocks).toEqual([
			{ index: 0, id: null, text: '最初の見出し' },
			{ index: 1, id: null, text: '本文1' },
		]);
	});

	test('throws stale for a malformed token', async () => {
		const error = (await requireReadToken(fixture.ctx, 'about.html', 'garbage').catch(
			(error_: unknown) => error_,
		)) as AgentError;
		expect(error).toBeInstanceOf(AgentError);
		expect(error.code).toBe('stale');
		expect(error.extra.readToken).toBe(await issueReadToken('about.html', aboutPath));
	});

	test('throws stale for a token minted for another path', async () => {
		const token = await issueReadToken('other.html', aboutPath);
		const error = (await requireReadToken(fixture.ctx, 'about.html', token).catch(
			(error_: unknown) => error_,
		)) as AgentError;
		expect(error).toBeInstanceOf(AgentError);
		expect(error.code).toBe('stale');
		expect(error.extra.readToken).toBe(await issueReadToken('about.html', aboutPath));
	});

	test('throws stale after the file changed, carrying a readToken for the NEW content', async () => {
		const token = await issueReadToken('about.html', aboutPath);
		await fs.appendFile(aboutPath, '\n<!-- edited -->', 'utf8');
		const error = (await requireReadToken(fixture.ctx, 'about.html', token).catch(
			(error_: unknown) => error_,
		)) as AgentError;
		expect(error).toBeInstanceOf(AgentError);
		expect(error.code).toBe('stale');
		expect(error.extra.readToken).not.toBe(token);
		expect(error.extra.readToken).toBe(await issueReadToken('about.html', aboutPath));
		expect(error.toPayload().error).toBe('stale');
	});
});
