import fs from 'node:fs/promises';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { mockStdin } from './__tests__/disposables.js';
import { resolveSpec } from './spec-input.js';

const FIXTURE_ROOT = path.resolve(import.meta.dirname, '../.tmp-spec-input-fixture');

beforeAll(async () => {
	await fs.mkdir(FIXTURE_ROOT, { recursive: true });
});

afterAll(async () => {
	await fs.rm(FIXTURE_ROOT, { recursive: true, force: true }).catch(() => {});
});

describe('resolveSpec', () => {
	test('--spec inline JSON wins over --spec-file and stdin (source: inline)', async () => {
		const filePath = path.join(FIXTURE_ROOT, 'never.json');
		await fs.writeFile(filePath, JSON.stringify({ source: 'file' }), 'utf8');
		using _ = mockStdin(false, JSON.stringify({ source: 'stdin' }));
		const result = await resolveSpec(JSON.stringify({ source: 'inline' }), filePath);
		expect(result.source).toBe('inline');
		expect(result.value).toEqual({ source: 'inline' });
	});

	test('--spec-file is used when --spec is absent (source: file)', async () => {
		const filePath = path.join(FIXTURE_ROOT, 'fromfile.json');
		await fs.writeFile(filePath, JSON.stringify({ source: 'file', n: 7 }), 'utf8');
		using _ = mockStdin(false, JSON.stringify({ source: 'stdin' }));
		const result = await resolveSpec(undefined, filePath);
		expect(result.source).toBe('file');
		expect(result.value).toEqual({ source: 'file', n: 7 });
	});

	test('stdin is consumed only when both --spec and --spec-file are absent (source: stdin)', async () => {
		using _ = mockStdin(false, JSON.stringify({ source: 'stdin' }));
		const result = await resolveSpec();
		expect(result.source).toBe('stdin');
		expect(result.value).toEqual({ source: 'stdin' });
	});

	test('returns {value: null, source: "none"} when no source is provided and stdin is a TTY', async () => {
		using _ = mockStdin(true, null);
		const result = await resolveSpec();
		expect(result).toEqual({ value: null, source: 'none' });
	});

	test('returns {value: null, source: "none"} when stdin is piped but empty', async () => {
		using _ = mockStdin(false, '');
		const result = await resolveSpec();
		expect(result).toEqual({ value: null, source: 'none' });
	});

	test('propagates JSON parse errors from --spec', async () => {
		await expect(resolveSpec('{ not json')).rejects.toThrow(SyntaxError);
	});

	test('propagates JSON parse errors from --spec-file', async () => {
		const filePath = path.join(FIXTURE_ROOT, 'bad.json');
		await fs.writeFile(filePath, '{ not json', 'utf8');
		await expect(resolveSpec(undefined, filePath)).rejects.toThrow(SyntaxError);
	});

	test('propagates ENOENT when --spec-file points to a missing path', async () => {
		await expect(
			resolveSpec(undefined, path.join(FIXTURE_ROOT, 'does-not-exist.json')),
		).rejects.toThrow(/ENOENT/);
	});
});
