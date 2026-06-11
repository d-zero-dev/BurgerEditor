import fs from 'node:fs/promises';
import path from 'node:path';

import * as cli from '@burger-editor/cli';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from 'vitest';

import registerV4Tools, { __resetV4ContextCache } from './v4.js';

const EXPECTED_V4_TOOLS = [
	'page_list',
	'page_get',
	'page_create',
	'page_delete',
	'page_rename',
	'page_copy',
	'page_concat',
	'front_matter_get',
	'front_matter_set',
	'block_list',
	'block_get',
	'block_insert',
	'block_replace',
	'block_delete',
	'block_move',
	'catalog_list',
	'catalog_get',
	'item_list',
	'item_schema',
	'style_options_list',
	'container_options_list',
	'config_resolve',
	'duplicate_block',
	'update_page',
] as const;

let client: Client;
let originalCwd: string;
let tmpRoot: string;

// loadContext() walks cosmiconfig from process.cwd() to find a
// burgereditor.config.js. We co-locate the fixture under the mcp-server
// package's own directory tree so module resolution (`@burger-editor/blocks`
// inside the config) works via the workspace's node_modules.
beforeAll(async () => {
	originalCwd = process.cwd();
	tmpRoot = await fs.mkdtemp(
		path.join(path.resolve(import.meta.dirname, '../../'), '.tmp-v4-spec-'),
	);
	const docRoot = path.join(tmpRoot, 'src');
	await fs.mkdir(docRoot, { recursive: true });
	await fs.writeFile(
		path.join(docRoot, 'index.html'),
		`<div class="content"><div data-bge-name="h2" data-bge-container="inline:immutable"><div data-bge-container-frame><div data-bge-group><div data-bge-item><div data-bgi="title-h2"><h2 data-bge="title-h2">Hello</h2></div></div></div></div></div></div>`,
		'utf8',
	);
	await fs.writeFile(
		path.join(tmpRoot, 'burgereditor.config.mjs'),
		`import { defaultCatalog } from '@burger-editor/blocks';
export default {
	documentRoot: './src',
	assetsRoot: './src',
	editableArea: '.content',
	catalog: defaultCatalog,
	newFileContent: '<div class="content"></div>',
};
`,
		'utf8',
	);
	process.chdir(tmpRoot);

	// Fresh server per spec — avoid polluting the shared singleton used by
	// other tool specs.
	const server = new McpServer({ name: 'burger-editor-v4-test', version: '0.0.0' });
	registerV4Tools(server);

	client = new Client({ name: 'v4-test-client', version: '0.0.0' });
	const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
	await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
});

afterAll(async () => {
	process.chdir(originalCwd);
	await fs.rm(tmpRoot, { recursive: true, force: true }).catch(() => {});
});

describe('registerV4Tools — tool registration', () => {
	test('registers every expected v4 tool name exactly once', async () => {
		const list = await client.listTools();
		const names = list.tools.map((t) => t.name).toSorted();
		expect(names).toEqual([...EXPECTED_V4_TOOLS].toSorted());
	});

	test('every registered tool exposes a non-empty description', async () => {
		const list = await client.listTools();
		const missing = list.tools.filter(
			(t) => !t.description || t.description.length === 0,
		);
		expect(missing).toEqual([]);
	});

	test('block_insert tool input schema requires path + atIndex + spec', async () => {
		const list = await client.listTools();
		const tool = list.tools.find((t) => t.name === 'block_insert')!;
		expect(tool.inputSchema.required).toEqual(
			expect.arrayContaining(['path', 'atIndex', 'spec']),
		);
	});

	test('update_page tool input schema requires path + operations', async () => {
		const list = await client.listTools();
		const tool = list.tools.find((t) => t.name === 'update_page')!;
		expect(tool.inputSchema.required).toEqual(
			expect.arrayContaining(['path', 'operations']),
		);
	});
});

describe('registerV4Tools — read tools end-to-end through the MCP transport', () => {
	test('catalog_list returns a populated catalogs array', async () => {
		const result = (await client.callTool({ name: 'catalog_list', arguments: {} })) as {
			content: { type: 'text'; text: string }[];
		};
		const payload = JSON.parse(result.content[0]!.text) as { catalogs: unknown[] };
		expect(payload.catalogs.length).toBeGreaterThan(0);
	});

	test('item_list returns the canonical item name set', async () => {
		const result = (await client.callTool({ name: 'item_list', arguments: {} })) as {
			content: { type: 'text'; text: string }[];
		};
		const payload = JSON.parse(result.content[0]!.text) as { items: string[] };
		expect(payload.items).toContain('title-h2');
	});

	test('container_options_list returns the static layout vocabulary', async () => {
		const result = (await client.callTool({
			name: 'container_options_list',
			arguments: {},
		})) as { content: { type: 'text'; text: string }[] };
		const payload = JSON.parse(result.content[0]!.text) as { types: string[] };
		expect(payload.types).toEqual(['grid', 'inline', 'float']);
	});

	test('block_list runs against the fixture project and returns its sole block', async () => {
		const result = (await client.callTool({
			name: 'block_list',
			arguments: { path: 'index.html' },
		})) as { content: { type: 'text'; text: string }[] };
		const payload = JSON.parse(result.content[0]!.text) as {
			blocks: { data: { name: string } }[];
		};
		expect(payload.blocks).toHaveLength(1);
		expect(payload.blocks[0]!.data.name).toBe('h2');
	});
});

describe('registerV4Tools — schema rejections', () => {
	test('block_insert returns isError when the spec argument is missing', async () => {
		// MCP surfaces validation failures as `{ isError: true }` payloads, not
		// thrown exceptions. Assert the wire-level result rather than rejection.
		const result = (await client.callTool({
			name: 'block_insert',
			arguments: { path: 'index.html', atIndex: 0 },
		})) as { isError?: boolean };
		expect(result.isError).toBe(true);
	});

	test('update_page returns isError for an empty operations array', async () => {
		const result = (await client.callTool({
			name: 'update_page',
			arguments: { path: 'index.html', operations: [] },
		})) as { isError?: boolean };
		expect(result.isError).toBe(true);
	});
});

describe('registerV4Tools — context caching', () => {
	afterEach(() => {
		vi.restoreAllMocks();
		__resetV4ContextCache();
	});

	test('withContext loads the CliContext exactly once across multiple tool calls', async () => {
		// Spy AFTER reset so we count fresh calls. Without the cache, every
		// tool call re-runs loadContext (cosmiconfig walk + virtualTree
		// resolver scan) — for a 20-tool agent session that's O(files × calls).
		__resetV4ContextCache();
		const loadSpy = vi.spyOn(cli, 'loadContext');
		await client.callTool({ name: 'catalog_list', arguments: {} });
		await client.callTool({ name: 'item_list', arguments: {} });
		await client.callTool({ name: 'container_options_list', arguments: {} });
		await client.callTool({ name: 'catalog_list', arguments: {} });
		expect(loadSpy).toHaveBeenCalledTimes(1);
	});

	test('__resetV4ContextCache forces the next tool call to reload the context', async () => {
		__resetV4ContextCache();
		const loadSpy = vi.spyOn(cli, 'loadContext');
		await client.callTool({ name: 'catalog_list', arguments: {} });
		expect(loadSpy).toHaveBeenCalledTimes(1);
		__resetV4ContextCache();
		await client.callTool({ name: 'catalog_list', arguments: {} });
		expect(loadSpy).toHaveBeenCalledTimes(2);
	});
});
