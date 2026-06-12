import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, test } from 'vitest';

describe('mcp-server package.json bin field', () => {
	const pkg = JSON.parse(
		readFileSync(path.resolve(import.meta.dirname, '..', 'package.json'), 'utf8'),
	) as { bin: Record<string, string> };

	test('exposes the scoped name @burger-editor/mcp-server', () => {
		expect(pkg.bin['@burger-editor/mcp-server']).toBe('./bin/index.js');
	});

	test('preserves the legacy bge-mcp-server alias for backward compatibility', () => {
		// External MCP host configs (Claude Desktop config, Cursor entries,
		// IDE plugins) registered the server as `bge-mcp-server` before the
		// rename. Removing this alias breaks every such config silently on
		// upgrade — there's no install-time warning npm can surface.
		expect(pkg.bin['bge-mcp-server']).toBe('./bin/index.js');
	});
});
