import fs from 'node:fs/promises';
import path from 'node:path';

import { agentTools } from '@burger-editor/cli';
import { mkdtempDisposable } from '@d-zero/shared/mkdtemp-disposable';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { __resetV4ContextCache } from './context.js';

import { registerTools } from './index.js';

// Spelled out rather than derived from `agentTools` so that a tool
// accidentally dropped from (or renamed in) cli's registry fails here
// instead of being silently reflected into the expectation.
const EXPECTED_TOOL_NAMES = [
	'get_block_type',
	'get_block_data_params_v3',
	'create_block_v3',
	'page_list',
	'page_get',
	'page_blocks',
	'block_get',
	'block_insert',
	'block_replace',
	'block_delete',
	'block_move',
	'block_duplicate',
	'block_ensure_id',
	'item_update',
	'page_update',
	'page_create',
	'page_delete',
	'page_rename',
	'page_copy',
	'page_concat',
	'front_matter_get',
	'front_matter_set',
	'catalog_list',
	'catalog_get',
	'item_list',
	'item_schema',
	'style_options_list',
	'container_options_list',
	'config_resolve',
	'editor_state_get',
	'editor_wait_for_event',
];

let client: Client;
let stack: AsyncDisposableStack;
let docRoot: string;

/**
 * @param result
 * @param result.content
 */
function textPayload(result: { content: unknown }): unknown {
	const text =
		(result.content as Array<{ type: string; text?: string }>)[0]?.text ?? '{}';
	return JSON.parse(text);
}

beforeAll(async () => {
	stack = new AsyncDisposableStack();
	const originalCwd = process.cwd();
	const tmp = await mkdtempDisposable(
		path.join(path.resolve(import.meta.dirname, '../../'), '.tmp-index-spec-'),
	);
	stack.use(tmp);
	stack.defer(() => {
		process.chdir(originalCwd);
		__resetV4ContextCache();
	});

	docRoot = path.join(tmp.path, 'src');
	await fs.mkdir(docRoot, { recursive: true });
	await fs.writeFile(
		path.join(docRoot, 'index.html'),
		`<div class="content"><div data-bge-name="h2" data-bge-container="inline:immutable"><div data-bge-container-frame><div data-bge-group><div data-bge-item><div data-bgi="title-h2"><h2 data-bge="title-h2">Hello</h2></div></div></div></div></div></div>`,
		'utf8',
	);
	await fs.writeFile(
		path.join(tmp.path, 'burgereditor.config.mjs'),
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
	process.chdir(tmp.path);

	const server = new McpServer({ name: 'burger-editor-index-test', version: '0.0.0' });
	stack.defer(async () => {
		await server.close();
	});
	registerTools(server, { mode: 'disk', localUrl: 'http://127.0.0.1:1' });

	client = new Client({ name: 'index-test-client', version: '0.0.0' });
	stack.defer(async () => {
		await client.close();
	});
	const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
	await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
});

afterAll(async () => {
	await stack.disposeAsync();
});

describe('registerTools — v3 compat + agent tools coexist', () => {
	test('lists the 3 v3 compat tools followed by the 28 agent tools in registration order, exactly once', async () => {
		const list = await client.listTools();
		expect(list.tools.map((t) => t.name)).toEqual(EXPECTED_TOOL_NAMES);
	});

	test('every agent tool is registered with annotations', async () => {
		const list = await client.listTools();
		const agentToolNames = new Set(agentTools.map((t) => t.name));
		const missingAnnotations = list.tools
			.filter((t) => agentToolNames.has(t.name) && !t.annotations)
			.map((t) => t.name);
		expect(missingAnnotations).toEqual([]);
	});

	test('a tool that defines an output schema (config_resolve) advertises outputSchema', async () => {
		const list = await client.listTools();
		const registered = list.tools.find((t) => t.name === 'config_resolve');
		expect(registered?.outputSchema).toBeDefined();
	});

	test('calling config_resolve returns structuredContent matching its outputSchema', async () => {
		const result = await client.callTool({ name: 'config_resolve', arguments: {} });
		expect(result.isError).not.toBe(true);
		expect(result.structuredContent).toMatchObject({
			documentRoot: expect.stringContaining('src'),
		});
	});

	test('block_insert through the full MCP transport writes to disk and returns readToken/appliedTo/result.block', async () => {
		// Exercises the whole chain register-agent-tools.ts spins up: routeToolCall
		// (disk mode) -> tool.run() -> handlers.ts -> saveContent, then back through
		// register-agent-tools.ts's appliedTo merge and JSON serialization over the
		// real MCP transport — not just calling blockInsertTool.run() directly.
		const first = textPayload(
			await client.callTool({ name: 'page_blocks', arguments: { path: 'index.html' } }),
		) as { readToken: string };
		const second = textPayload(
			await client.callTool({
				name: 'page_blocks',
				arguments: { path: 'index.html', readToken: first.readToken },
			}),
		) as { readToken: string };

		const result = await client.callTool({
			name: 'block_insert',
			arguments: {
				path: 'index.html',
				index: 0,
				spec: {
					catalog: 'h2',
					items: [[{ name: 'title-h2', data: { titleH2: 'via MCP' } }]],
				},
				readToken: second.readToken,
			},
		});
		expect(result.isError).not.toBe(true);
		const payload = textPayload(result) as {
			appliedTo: string;
			readToken: string;
			block: { data: { name: string } };
		};
		expect(payload.appliedTo).toBe('disk');
		expect(typeof payload.readToken).toBe('string');
		expect(payload.block.data.name).toBe('h2');

		const raw = await fs.readFile(path.join(docRoot, 'index.html'), 'utf8');
		expect(raw).toContain('via MCP');
	});

	test('a failing agent-tool call (missing readToken) returns isError with agentErrorSchema shape', async () => {
		const result = await client.callTool({
			name: 'block_get',
			arguments: { path: 'index.html', target: { index: 0 } },
		});
		expect(result.isError).toBe(true);
		const text =
			(result.content as Array<{ type: string; text?: string }>)[0]?.text ?? '';
		const payload = JSON.parse(text) as { error: string; message: string };
		expect(payload.error).toBe('read-required');
		expect(typeof payload.message).toBe('string');
	});

	test('v3 compat tools are unaffected — get_block_type still resolves', async () => {
		const list = await client.listTools();
		const v3 = list.tools.find((t) => t.name === 'get_block_type');
		expect(v3).toBeDefined();
	});
});
