import type { MockInstance } from 'vitest';

import fs from 'node:fs/promises';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { disposableSpy } from '../__tests__/disposables.js';
import {
	makeLocalServerConfig,
	makeTmpRoots,
	type TmpRoots,
} from '../__tests__/fixtures.js';

import { bootLocalServer } from './server.js';

describe('bootLocalServer (virtualTree) — boot aborts before the HTTP server binds', () => {
	let roots: TmpRoots;
	let errorCalls: string[];
	let errorSpy: MockInstance & Disposable;
	let exitSpy: MockInstance & Disposable;

	beforeEach(async () => {
		roots = await makeTmpRoots('bge-boot-');
		errorCalls = [];
		errorSpy = disposableSpy(console, 'error');
		errorSpy.mockImplementation((...args: unknown[]) => {
			errorCalls.push(args.map(String).join(' '));
		});
		// Translate process.exit into a thrown sentinel so the test runner
		// survives and we can observe the call from within the awaited
		// promise rejection.
		exitSpy = disposableSpy(process, 'exit');
		exitSpy.mockImplementation(((code?: number) => {
			throw new Error(`__test_exit__:${code ?? 0}`);
		}) as never);
	});

	afterEach(async () => {
		exitSpy[Symbol.dispose]();
		errorSpy[Symbol.dispose]();
		await roots[Symbol.asyncDispose]();
	});

	const boot = () =>
		bootLocalServer(
			makeLocalServerConfig({
				documentRoot: roots.documentRoot,
				virtualTree: { enabled: true, pathKey: 'path' },
				agent: { enabled: false },
			}),
			roots.path,
		);

	test('exits 1 with formatted stderr listing conflicting files (regression: #754)', async () => {
		await fs.writeFile(
			path.join(roots.documentRoot, '1.html'),
			'---\npath: about.html\n---\n<h1>One</h1>\n',
			'utf8',
		);
		await fs.writeFile(
			path.join(roots.documentRoot, '2.html'),
			'---\npath: about.html\n---\n<h1>Two</h1>\n',
			'utf8',
		);

		await expect(boot()).rejects.toThrow('__test_exit__:1');

		const stderr = errorCalls.join('\n');
		expect(stderr).toContain('Conflicting logical paths');
		expect(stderr).toContain('about.html');
		expect(stderr).toContain('1.html');
		expect(stderr).toContain('2.html');
		expect(stderr).toContain('Fix the conflicting front matter "path" values');
		// The formatted message is what the operator should see — Node's
		// default uncaught handler (which emits `PathConflictError:` and
		// stack frames) must not be the source of the output.
		expect(stderr).not.toContain('PathConflictError:');
		expect(stderr).not.toMatch(/^\s+at\s/m);
		expect(exitSpy).toHaveBeenCalledWith(1);
	});

	test('exits 1 with the file name when a frontmatter pathKey is missing (regression: #754)', async () => {
		await fs.writeFile(
			path.join(roots.documentRoot, '7.html'),
			'<h1>no front matter</h1>\n',
			'utf8',
		);

		await expect(boot()).rejects.toThrow('__test_exit__:1');

		const stderr = errorCalls.join('\n');
		expect(stderr).toContain('Failed to load virtualTree resolver state');
		expect(stderr).toContain('7.html');
		expect(exitSpy).toHaveBeenCalledWith(1);
	});
});

describe('bootLocalServer — successful boot', () => {
	let roots: TmpRoots;

	beforeEach(async () => {
		roots = await makeTmpRoots('bge-boot-ok-');
	});

	afterEach(async () => {
		await roots[Symbol.asyncDispose]();
	});

	test('binds a real port and returns a disposable handle', async () => {
		// Bind AND connect via the literal `127.0.0.1` rather than the hostname
		// `localhost` — some CI runners resolve `localhost` to a different
		// address for the bind side (Node's server) than for the connect side
		// (fetch's own DNS lookup), which would refuse every connection here
		// even though the server is genuinely listening (see agent/ws.spec.ts's
		// `bootServer` doc comment for the same issue).
		await using handle = await bootLocalServer(
			makeLocalServerConfig({
				documentRoot: roots.documentRoot,
				host: '127.0.0.1',
				agent: { enabled: false },
			}),
			roots.path,
		);
		expect(handle.port).toBeGreaterThan(0);
		expect(handle.url).toBe(`http://127.0.0.1:${handle.port}`);
		const res = await fetch(`${handle.url}/api/health`, {
			headers: { connection: 'close' },
		});
		expect(res.status).toBe(200);
	});
});
