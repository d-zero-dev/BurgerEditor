import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';

import { agentInstructions } from '@burger-editor/cli';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { describe, expect, test, vi } from 'vitest';

import { startServer } from './start-server.js';

const OPTIONS = { mode: 'disk', localUrl: 'http://127.0.0.1:1' } as const;

/**
 * Boot a server on one end of an in-memory pair and connect a client to the
 * other. The client is closed by disposing the server handle (the in-memory
 * transport closes its peer), so only the handle needs disposing.
 */
async function boot() {
	const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
	const client = new Client({ name: 'start-server-test-client', version: '0.0.0' });
	const [handle] = await Promise.all([
		startServer(OPTIONS, serverTransport),
		client.connect(clientTransport),
	]);
	return { handle, client };
}

describe('startServer', () => {
	test('serves the registered tools and the agent instructions', async () => {
		const { handle, client } = await boot();
		await using _handle = handle;

		const list = await client.listTools();
		expect(list.tools.map((t) => t.name)).toContain('get_block_type');
		expect(list.tools.map((t) => t.name)).toContain('page_blocks');
		expect(client.getInstructions()).toBe(agentInstructions);
	});

	test('disposing the handle closes the transport, so the client is disconnected (regression: #870)', async () => {
		const { handle, client } = await boot();

		await handle[Symbol.asyncDispose]();

		await expect(client.listTools()).rejects.toThrow('Not connected');
	});

	test('closes the transport before rethrowing when connect() fails, since no handle reaches the caller', async () => {
		const close = vi.fn(async () => {});
		const transport: Transport = {
			start: () => Promise.reject(new Error('transport start failed')),
			send: async () => {},
			close,
		};

		await expect(startServer(OPTIONS, transport)).rejects.toThrow(
			'transport start failed',
		);
		expect(close).toHaveBeenCalledTimes(1);
	});

	test('can start again after a previous server was disposed, without a duplicate-registration error', async () => {
		const first = await boot();
		await first.handle[Symbol.asyncDispose]();

		const second = await boot();
		await using _handle = second.handle;

		const list = await second.client.listTools();
		expect(list.tools.map((t) => t.name)).toContain('get_block_type');
	});
});
