import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import server from './server.js';
import createBlockV3 from './tools/create-block-v3.js';
import getBlockDataParamsV3 from './tools/get-block-data-params-v3.js';
import getBlockType from './tools/get-block-type.js';

/**
 *
 * @param server
 */
function registerTools(server: McpServer) {
	getBlockType(server);
	getBlockDataParamsV3(server);
	createBlockV3(server);
}

/**
 *
 */
export async function run() {
	registerTools(server);
	const transport = new StdioServerTransport();
	await server.connect(transport);
}
