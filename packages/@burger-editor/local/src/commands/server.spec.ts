import type { MockInstance } from 'vitest';

import { once } from 'node:events';
import fs from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';

import { clearConfigCache } from '@burger-editor/file-io';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { disposableSpy } from '../__tests__/disposables.js';
import {
	makeLocalServerConfig,
	makeTmpRoots,
	type TmpRoots,
} from '../__tests__/fixtures.js';

import { bootLocalServer, runServerCommand } from './server.js';

// Only `runServerCommand` opens a browser; make that step fail on demand.
vi.mock('open', () => ({
	default: vi.fn(() => Promise.reject(new Error('no browser available'))),
}));

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

	test('installs SIGINT/SIGTERM handlers while booted and removes them on dispose', async () => {
		const sigintBefore = process.listenerCount('SIGINT');
		const sigtermBefore = process.listenerCount('SIGTERM');
		{
			await using _handle = await bootLocalServer(
				makeLocalServerConfig({
					documentRoot: roots.documentRoot,
					host: '127.0.0.1',
					agent: { enabled: false },
				}),
				roots.path,
			);
			expect(process.listenerCount('SIGINT')).toBe(sigintBefore + 1);
			expect(process.listenerCount('SIGTERM')).toBe(sigtermBefore + 1);
		}
		expect(process.listenerCount('SIGINT')).toBe(sigintBefore);
		expect(process.listenerCount('SIGTERM')).toBe(sigtermBefore);
	});

	test('a non-loopback bind with agent.enabled: false still requires the token for pages and /api/content', async () => {
		await using handle = await bootLocalServer(
			makeLocalServerConfig({
				documentRoot: roots.documentRoot,
				host: '0.0.0.0',
				agent: { enabled: false },
			}),
			roots.path,
		);
		expect(handle.agent).toBeNull();
		expect(handle.auth.required).toBe(true);
		const base = `http://127.0.0.1:${handle.port}`;

		const anonymousPage = await fetch(`${base}/config.json`, {
			headers: { connection: 'close' },
		});
		expect(anonymousPage.status).toBe(401);

		const anonymousWrite = await fetch(`${base}/api/content`, {
			method: 'POST',
			headers: { connection: 'close', 'content-type': 'application/json' },
			body: '{}',
		});
		expect(anonymousWrite.status).toBe(401);

		const authed = await fetch(`${base}/config.json`, {
			headers: { connection: 'close', authorization: `Bearer ${handle.auth.token}` },
		});
		expect(authed.status).toBe(200);
	});
});

describe('bootLocalServer — bind failure (regression: #1000)', () => {
	let roots: TmpRoots;
	let blocker: net.Server;

	beforeEach(async () => {
		roots = await makeTmpRoots('bge-boot-bind-');
		blocker = net.createServer();
		blocker.listen(0, '0.0.0.0');
		await once(blocker, 'listening');
	});

	afterEach(async () => {
		await new Promise<void>((resolve) => blocker.close(() => resolve()));
		await roots[Symbol.asyncDispose]();
	});

	test('disposes the resources acquired before the bind, so the token file is not left on disk', async () => {
		const port = (blocker.address() as net.AddressInfo).port;

		await expect(
			bootLocalServer(
				makeLocalServerConfig({
					documentRoot: roots.documentRoot,
					host: '0.0.0.0',
					port,
					agent: { enabled: true },
				}),
				roots.path,
			),
		).rejects.toMatchObject({ code: 'EADDRINUSE' });

		await expect(
			fs.access(path.join(roots.path, '.burgereditor', 'agent-token')),
		).rejects.toMatchObject({ code: 'ENOENT' });
	});
});

describe('bootLocalServer — signal shutdown exit code (regression: #1000)', () => {
	let roots: TmpRoots;
	let exitSpy: MockInstance & Disposable;
	let stderrSpy: MockInstance & Disposable;

	beforeEach(async () => {
		roots = await makeTmpRoots('bge-boot-signal-');
		exitSpy = disposableSpy(process, 'exit');
		exitSpy.mockImplementation((() => {}) as never);
		stderrSpy = disposableSpy(process.stderr, 'write');
		// Run the write callback: the failure path exits from it.
		stderrSpy.mockImplementation((...args: unknown[]) => {
			const callback = args.findLast((arg) => typeof arg === 'function') as
				(() => void) | undefined;
			callback?.();
			return true;
		});
	});

	afterEach(async () => {
		stderrSpy[Symbol.dispose]();
		exitSpy[Symbol.dispose]();
		await roots[Symbol.asyncDispose]();
	});

	/**
	 * Boot, then return the SIGTERM listener `bootLocalServer` installed. It
	 * is invoked directly instead of via `process.emit('SIGTERM')`, which
	 * would also reach whatever SIGTERM listeners the test runner holds.
	 */
	async function bootAndGetShutdown() {
		const sigintBefore = process.listenerCount('SIGINT');
		const sigtermBefore = process.listenerCount('SIGTERM');
		const before = new Set(process.listeners('SIGTERM'));
		const handle = await bootLocalServer(
			makeLocalServerConfig({
				documentRoot: roots.documentRoot,
				host: '127.0.0.1',
				agent: { enabled: false },
			}),
			roots.path,
		);
		const shutdown = process.listeners('SIGTERM').find((l) => !before.has(l))!;
		return { handle, shutdown, sigintBefore, sigtermBefore };
	}

	/**
	 * Everything written to the stubbed stderr, joined.
	 */
	function stderrText() {
		return stderrSpy.mock.calls.map((args) => String(args[0])).join('');
	}

	test('exits 0 once every resource is disposed', async () => {
		const { handle, shutdown } = await bootAndGetShutdown();
		await using _handle = handle;

		shutdown('SIGTERM');

		await vi.waitFor(() => expect(exitSpy).toHaveBeenCalled());
		expect(exitSpy).toHaveBeenCalledWith(0);
		expect(stderrText()).not.toContain('failed to shut down cleanly');
	});

	test('detaches from both signals before disposing, so a different second signal cannot re-enter and exit 0 mid-teardown', async () => {
		const { handle, shutdown, sigintBefore, sigtermBefore } = await bootAndGetShutdown();
		await using _handle = handle;

		shutdown('SIGTERM');

		expect(process.listenerCount('SIGINT')).toBe(sigintBefore);
		expect(process.listenerCount('SIGTERM')).toBe(sigtermBefore);
		await vi.waitFor(() => expect(exitSpy).toHaveBeenCalled());
	});

	test('exits 1 and reports the cause on stderr when disposal fails', async () => {
		const { handle, shutdown } = await bootAndGetShutdown();
		await using _handle = handle;
		// Installed after boot so the injected failure can only land on a
		// close() issued by the shutdown below.
		const realClose = http.Server.prototype.close;
		using closeSpy = disposableSpy(http.Server.prototype, 'close');
		// Really close (so the port is released) but report a failure.
		closeSpy.mockImplementationOnce(function (
			this: http.Server,
			callback?: (err?: Error) => void,
		) {
			return realClose.call(this, () => callback?.(new Error('close failed')));
		});

		shutdown('SIGTERM');

		await vi.waitFor(() => expect(exitSpy).toHaveBeenCalled());
		expect(exitSpy).toHaveBeenCalledWith(1);
		expect(stderrText()).toContain('BurgerEditor: failed to shut down cleanly');
		expect(stderrText()).toContain('close failed');
	});
});

describe('runServerCommand — a step after boot fails (regression: #1000)', () => {
	let roots: TmpRoots;
	let configPath: string;

	beforeEach(async () => {
		clearConfigCache();
		vi.stubEnv('DEV_MODE', 'false');
		roots = await makeTmpRoots('bge-run-server-');
		configPath = path.join(roots.path, 'burgereditor.config.mjs');
		// `open: true` reaches the mocked `open()`, which rejects.
		await fs.writeFile(
			configPath,
			`export default { documentRoot: ${JSON.stringify(roots.documentRoot)}, host: '127.0.0.1', port: 0, open: true };\n`,
			'utf8',
		);
	});

	afterEach(async () => {
		vi.unstubAllEnvs();
		await roots[Symbol.asyncDispose]();
	});

	test('disposes the booted server before rethrowing, so its signal handlers do not outlive the failed command', async () => {
		const sigintBefore = process.listenerCount('SIGINT');
		const sigtermBefore = process.listenerCount('SIGTERM');

		await expect(runServerCommand({ configPath })).rejects.toThrow(
			'no browser available',
		);

		// The handlers are removed only by disposing the boot handle.
		expect(process.listenerCount('SIGINT')).toBe(sigintBefore);
		expect(process.listenerCount('SIGTERM')).toBe(sigtermBefore);
	});
});
