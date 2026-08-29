import { spawn } from 'node:child_process';
import path from 'node:path';

import { describe, expect, test } from 'vitest';

const BIN_PATH = path.resolve(import.meta.dirname, '..', 'bin', 'index.js');

/**
 * Run the bin entry and resolve once stderr matches `done` (or `timeoutMs`
 * elapses, whichever comes first). The fixed-window approach we tried first
 * raced with vitest's parallel test execution — under load, 2 s wasn't
 * enough to even reach `await server.connect(transport)`. Wait for a real
 * signal instead.
 * @param done regex that signals startup is far enough along to assert
 * @param timeoutMs hard cap so a hung child doesn't hang the test
 * @param args extra CLI args (e.g. `--mode`, `--url`) appended after BIN_PATH
 */
function captureStartupStderr(
	done: RegExp,
	timeoutMs = 15_000,
	args: readonly string[] = [],
): Promise<string> {
	return new Promise((resolve, reject) => {
		const child = spawn(process.execPath, [BIN_PATH, ...args], {
			stdio: ['pipe', 'pipe', 'pipe'],
		});
		let stderr = '';
		// Hard cap so a hung child can't hang the suite. Cleared on every exit
		// path below — otherwise it fires again up to timeoutMs later (killing
		// an already-dead child is harmless, but the dangling timer keeps the
		// event loop — and vitest's teardown — waiting on it).
		const timer = setTimeout(finish, timeoutMs);
		/**
		 *
		 */
		function finish() {
			clearTimeout(timer);
			child.kill();
			resolve(stderr);
		}
		child.stderr.on('data', (chunk: Buffer) => {
			stderr += chunk.toString('utf8');
			if (done.test(stderr)) finish();
		});
		child.on('error', (error) => {
			clearTimeout(timer);
			reject(error);
		});
	});
}

describe('mcp-server bin startup logging', () => {
	test('writes a recognizable "starting" line to stderr on boot', async () => {
		// External MCP host configs (Claude Code, Claude Desktop, Cursor)
		// surface server stderr in their logs. Operators MUST see a
		// breadcrumb identifying that the burger-editor server actually
		// started — a silent server that fails tool advertisement is the
		// exact bug feedback #7 reported.
		const stderr = await captureStartupStderr(/\[burger-editor mcp\] starting/);
		expect(stderr).toMatch(/\[burger-editor mcp\] starting/);
	}, 20_000);

	test('writes a "ready on stdio" line after registration + transport connect', async () => {
		// Pin the post-registration confirmation so a future refactor that
		// reorders `await server.connect(transport)` and the log line is
		// caught here, not in production.
		const stderr = await captureStartupStderr(/\[burger-editor mcp\] ready on stdio/);
		expect(stderr).toMatch(/\[burger-editor mcp\] ready on stdio/);
		expect(stderr).toMatch(/v3 \+ agent tools registered/);
	}, 20_000);

	test('the "starting" line reports the resolved mode and url, defaulting to auto / localhost:5255', async () => {
		const stderr = await captureStartupStderr(/\[burger-editor mcp\] starting/);
		expect(stderr).toMatch(/mode=auto/);
		expect(stderr).toMatch(/url=http:\/\/localhost:5255/);
	}, 20_000);

	test('--mode and --url flags override the defaults in the "starting" line', async () => {
		const stderr = await captureStartupStderr(/\[burger-editor mcp\] starting/, 15_000, [
			'--mode',
			'disk',
			'--url',
			'http://localhost:9999',
		]);
		expect(stderr).toMatch(/mode=disk/);
		expect(stderr).toMatch(/url=http:\/\/localhost:9999/);
	}, 20_000);
});
