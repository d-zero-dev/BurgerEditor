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
 */
function captureStartupStderr(done: RegExp, timeoutMs = 15_000): Promise<string> {
	return new Promise((resolve, reject) => {
		const child = spawn(process.execPath, [BIN_PATH], {
			stdio: ['pipe', 'pipe', 'pipe'],
		});
		let stderr = '';
		const finish = () => {
			child.kill();
			resolve(stderr);
		};
		child.stderr.on('data', (chunk: Buffer) => {
			stderr += chunk.toString('utf8');
			if (done.test(stderr)) finish();
		});
		child.on('error', reject);
		// Hard cap so a hung child can't hang the suite.
		setTimeout(finish, timeoutMs);
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
		expect(stderr).toMatch(/v3 \+ v4 tools registered/);
	}, 20_000);
});
