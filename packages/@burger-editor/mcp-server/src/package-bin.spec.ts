import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, test } from 'vitest';

describe('mcp-server package.json bin field', () => {
	const pkg = JSON.parse(
		readFileSync(path.resolve(import.meta.dirname, '..', 'package.json'), 'utf8'),
	) as { bin: Record<string, string> };

	test('exposes exactly one bin: bge-mcp-server (avoids PATH collision with other MCP servers)', () => {
		// Why one and not two: npm normalizes a scoped bin key
		// `@burger-editor/mcp-server` to the generic `mcp-server`, which then
		// collides on PATH / in node_modules/.bin with any other MCP server
		// package (e.g. @modelcontextprotocol/server-*). Single distinctive
		// alias `bge-mcp-server` keeps the server reachable while NOT
		// claiming the generic name.
		expect(Object.keys(pkg.bin).toSorted()).toEqual(['bge-mcp-server']);
		expect(pkg.bin['bge-mcp-server']).toBe('./bin/index.js');
	});

	test('does NOT expose a generic `mcp-server` bin (regression guard for the PATH collision)', () => {
		// Belt-and-suspenders: a future PR adding `"@burger-editor/mcp-server":
		// "./bin/index.js"` (which looks innocent) would silently re-introduce
		// the `mcp-server` collision after npm's scope-stripping. Catch it.
		expect(pkg.bin['mcp-server']).toBeUndefined();
		expect(pkg.bin['@burger-editor/mcp-server']).toBeUndefined();
	});

	test('npx @burger-editor/mcp-server still resolves because a single-bin package runs that bin', () => {
		// When a package has exactly ONE bin entry, npx <package> runs it
		// regardless of whether the bin name matches the unscoped package
		// name. This invariant is what lets us drop the generic alias
		// without breaking `npx @burger-editor/mcp-server` invocations.
		expect(Object.keys(pkg.bin)).toHaveLength(1);
	});
});
