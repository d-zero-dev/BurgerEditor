import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { describe, it, expect } from 'vitest';

import server from '../server.js';

import getBlockDataParamsV3 from './get-block-data-params-v3.js';

describe('get-block-data-params-v3', async () => {
	getBlockDataParamsV3(server);

	const client = new Client({
		name: 'test client',
		version: '1.0.0',
	});

	const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

	await Promise.all([
		// Client
		client.connect(clientTransport),
		// Server
		server.connect(serverTransport),
	]);

	it('should get block data params', async () => {
		const result = await client.callTool({
			name: 'get_block_data_params_v3',
			arguments: {
				blockName: 'image3',
			},
		});

		expect(result).toEqual({
			content: [
				{
					type: 'text',
					text: `[
  [
    "popup",
    "empty",
    "hr",
    "path",
    "srcset",
    "alt",
    "width",
    "height",
    "caption"
  ],
  [
    "popup",
    "empty",
    "hr",
    "path",
    "srcset",
    "alt",
    "width",
    "height",
    "caption"
  ],
  [
    "popup",
    "empty",
    "hr",
    "path",
    "srcset",
    "alt",
    "width",
    "height",
    "caption"
  ]
]`,
				},
			],
		});
	});
});
