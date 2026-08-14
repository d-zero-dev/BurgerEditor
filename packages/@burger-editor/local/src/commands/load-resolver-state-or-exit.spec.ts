import type { MockInstance } from 'vitest';

import fs from 'node:fs/promises';
import path from 'node:path';

import { mkdtempDisposable } from '@d-zero/shared/mkdtemp-disposable';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { disposableSpy } from '../__tests__/disposables.js';

import { loadResolverStateOrExit } from './load-resolver-state-or-exit.js';

describe('loadResolverStateOrExit', () => {
	let tmp: ({ path: string } & AsyncDisposable) | undefined;
	let documentRoot: string;
	let errorCalls: string[];
	let errorSpy: MockInstance & Disposable;
	let exitSpy: MockInstance & Disposable;

	beforeEach(async () => {
		tmp = await mkdtempDisposable('bge-server-load-');
		documentRoot = tmp.path;
		errorCalls = [];
		errorSpy = disposableSpy(console, 'error');
		errorSpy.mockImplementation((...args: unknown[]) => {
			errorCalls.push(args.map(String).join(' '));
		});
		// Translate process.exit into a thrown sentinel so the test runner survives
		// and we can observe the call from within the awaited promise rejection.
		exitSpy = disposableSpy(process, 'exit');
		exitSpy.mockImplementation(((code?: number) => {
			throw new Error(`__test_exit__:${code ?? 0}`);
		}) as never);
	});

	afterEach(async () => {
		await tmp?.[Symbol.asyncDispose]();
		errorSpy[Symbol.dispose]();
		exitSpy[Symbol.dispose]();
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
