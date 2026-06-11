import fs from 'node:fs/promises';
import path from 'node:path';
import { PassThrough } from 'node:stream';

import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';

import { resolveSpec } from './spec-input.js';

const FIXTURE_ROOT = path.resolve(import.meta.dirname, '../.tmp-spec-input-fixture');

beforeAll(async () => {
	await fs.mkdir(FIXTURE_ROOT, { recursive: true });
});

afterAll(async () => {
	await fs.rm(FIXTURE_ROOT, { recursive: true, force: true }).catch(() => {});
});

// process.stdin replacement: a PassThrough with a forced isTTY flag so
// resolveSpec's "is stdin piped?" branch follows our scenario instead of the
// vitest worker's terminal state.
/**
 *
 * @param isTTY
 * @param payload
 * @param run
 */
function withMockStdin<T>(
	isTTY: boolean,
	payload: string | null,
	run: () => Promise<T>,
): Promise<T> {
	const original = process.stdin;
	const mock = new PassThrough();
	Object.defineProperty(mock, 'isTTY', { value: isTTY, configurable: true });
	Object.defineProperty(process, 'stdin', { value: mock, configurable: true });
	if (payload === null) {
		mock.end('');
	} else {
		mock.end(payload);
	}
	return run().finally(() => {
		Object.defineProperty(process, 'stdin', { value: original, configurable: true });
	});
}

describe('resolveSpec', () => {
	afterEach(() => {
		// Defensive in case a test leaks stdin replacement (it shouldn't —
		// withMockStdin restores in finally — but lint-staged hooks etc. can
		// re-order things).
	});

	test('--spec inline JSON wins over --spec-file and stdin', async () => {
		const filePath = path.join(FIXTURE_ROOT, 'never.json');
		await fs.writeFile(filePath, JSON.stringify({ source: 'file' }), 'utf8');
		const result = await withMockStdin(false, JSON.stringify({ source: 'stdin' }), () =>
			resolveSpec(JSON.stringify({ source: 'inline' }), filePath),
		);
		expect(result).toEqual({ source: 'inline' });
	});

	test('--spec-file is used when --spec is absent', async () => {
		const filePath = path.join(FIXTURE_ROOT, 'fromfile.json');
		await fs.writeFile(filePath, JSON.stringify({ source: 'file', n: 7 }), 'utf8');
		const result = await withMockStdin(false, JSON.stringify({ source: 'stdin' }), () =>
			resolveSpec(undefined, filePath),
		);
		expect(result).toEqual({ source: 'file', n: 7 });
	});

	test('stdin is consumed only when both --spec and --spec-file are absent', async () => {
		const result = await withMockStdin(false, JSON.stringify({ source: 'stdin' }), () =>
			resolveSpec(),
		);
		expect(result).toEqual({ source: 'stdin' });
	});

	test('returns null when no source is provided and stdin is a TTY', async () => {
		const result = await withMockStdin(true, null, () => resolveSpec());
		expect(result).toBeNull();
	});

	test('returns null when stdin is piped but empty', async () => {
		const result = await withMockStdin(false, '', () => resolveSpec());
		expect(result).toBeNull();
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
