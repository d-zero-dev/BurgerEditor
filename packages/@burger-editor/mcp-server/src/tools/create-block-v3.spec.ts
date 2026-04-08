import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { describe, it, expect } from 'vitest';

import server from '../server.js';

import createBlockV3 from './create-block-v3.js';

describe('create-block-v3', async () => {
	createBlockV3(server);

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

	it('should create a block', async () => {
		const result = await client.callTool({
			name: 'create_block_v3',
			arguments: {
				blockName: 'title',
				data: [
					{
						titleH2: 'タイトル',
					},
				],
			},
		});

		expect(result).toMatchSnapshot();
	});

	it('should create a block with multiple items', async () => {
		const result = await client.callTool({
			name: 'create_block_v3',
			arguments: {
				blockName: 'image3',
				data: [
					{
						popup: false,
						empty: 0,
						hr: false,
						path: '/path/to/img/sample1.jpg',
						srcset: '',
						alt: '画像1',
						width: '',
						height: '',
						caption: '',
					},
					{
						ckeditor: 'テキスト1\n**"サンプル1"**',
					},
					{
						popup: false,
						empty: 0,
						hr: false,
						path: '/path/to/img/sample2.jpg',
						srcset: '',
						alt: '画像2',
						width: '',
						height: '',
						caption: '',
					},
					{
						ckeditor: 'テキスト2\n**"サンプル2"**',
					},
					{
						popup: false,
						empty: 0,
						hr: false,
						path: '/path/to/img/sample3.jpg',
						srcset: '',
						alt: '画像3',
						width: '',
						height: '',
						caption: '',
					},
					{
						ckeditor: 'テキスト3\n**"サンプル3"**',
					},
				],
			},
		});

		expect(result).toMatchSnapshot();
	});
});
