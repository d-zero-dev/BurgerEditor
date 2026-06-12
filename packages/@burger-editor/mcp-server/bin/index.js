#!/usr/bin/env node

// Pulling @burger-editor/file-io (transitively, via @burger-editor/cli used by
// v4 tools) installs lazy jsdom-backed DOM globals on first access — no
// upfront vitest/environments dependency required.

// Top-level catch: a thrown error from `run()` (registration / transport
// connect failure) or from the dist/index.js module load itself (e.g.
// missing peer, bad import, ESM resolution failure) would otherwise surface
// only as an unhandled-promise-rejection trace, which MCP host clients
// (Claude Code, Cursor, Claude Desktop) tend to swallow into a generic
// "MCP server crashed" message without breadcrumbs. Print a clear
// `[burger-editor mcp] FATAL ...` line so the host log shows the cause.
try {
	const { run } = await import('../dist/index.js');
	await run();
} catch (error) {
	const message = error instanceof Error ? error.message : String(error);
	const stack = error instanceof Error && error.stack ? `\n${error.stack}` : '';
	process.stderr.write(`[burger-editor mcp] FATAL: ${message}${stack}\n`);
	process.exit(1);
}
