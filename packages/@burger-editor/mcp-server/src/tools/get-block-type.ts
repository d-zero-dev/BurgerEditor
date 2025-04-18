import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { description } from '../analyzed-block-types.js';

/**
 *
 * @param server
 */
export default function (server: McpServer) {
	server.tool('get_block_type', 'Get general block type', () => {
		return {
			content: [
				{
					type: 'text',
					text: description,
				},
			],
		};
	});
}
