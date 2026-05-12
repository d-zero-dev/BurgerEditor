import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { loadResolverStateOrExit } from './load-resolver-state-or-exit.js';

describe('loadResolverStateOrExit', () => {
	let documentRoot: string;
	let errorCalls: string[];
	let errorSpy: ReturnType<typeof vi.spyOn>;
	let exitSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(async () => {
		documentRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bge-server-load-'));
		errorCalls = [];
		errorSpy = vi.spyOn(console, 'error').mockImplementation((...args) => {
			errorCalls.push(args.map(String).join(' '));
		});
		// Translate process.exit into a thrown sentinel so the test runner survives
		// and we can observe the call from within the awaited promise rejection.
		exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
			throw new Error(`__test_exit__:${code ?? 0}`);
		}) as never);
	});

	afterEach(async () => {
		await fs.rm(documentRoot, { recursive: true, force: true });
		errorSpy.mockRestore();
		exitSpy.mockRestore();
	});

	test('returns the resolver state when documentRoot is valid', async () => {
		await fs.writeFile(
			path.join(documentRoot, '1.html'),
			'---\npath: about.html\n---\n<h1>About</h1>\n',
			'utf8',
		);

		const state = await loadResolverStateOrExit(documentRoot, 'path');
		expect(state.diskToLogical.get('1.html')).toBe('about.html');
		expect(exitSpy).not.toHaveBeenCalled();
		expect(errorCalls).toEqual([]);
	});

	test('on PathConflictError: prints the conflicting files and exits with 1 (regression: #754)', async () => {
		await fs.writeFile(
			path.join(documentRoot, '1.html'),
			'---\npath: about.html\n---\n<h1>One</h1>\n',
			'utf8',
		);
		await fs.writeFile(
			path.join(documentRoot, '2.html'),
			'---\npath: about.html\n---\n<h1>Two</h1>\n',
			'utf8',
		);

		await expect(loadResolverStateOrExit(documentRoot, 'path')).rejects.toThrow(
			'__test_exit__:1',
		);

		const stderr = errorCalls.join('\n');
		expect(stderr).toContain('Conflicting logical paths');
		expect(stderr).toContain('about.html');
		expect(stderr).toContain('1.html');
		expect(stderr).toContain('2.html');
		// The wrapper formats the message itself; no stack-trace fragments leak.
		expect(stderr).not.toMatch(/^\s*at\s/m);
		expect(stderr).not.toContain('PathConflictError:');
		expect(exitSpy).toHaveBeenCalledWith(1);
	});

	test('on missing pathKey: includes the offending file name and exits with 1', async () => {
		await fs.writeFile(
			path.join(documentRoot, '7.html'),
			'<h1>no front matter</h1>\n',
			'utf8',
		);

		await expect(loadResolverStateOrExit(documentRoot, 'path')).rejects.toThrow(
			'__test_exit__:1',
		);

		const stderr = errorCalls.join('\n');
		expect(stderr).toContain('Failed to load virtualTree resolver state');
		expect(stderr).toContain('7.html');
		expect(exitSpy).toHaveBeenCalledWith(1);
	});
});
