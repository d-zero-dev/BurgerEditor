import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { z } from 'zod';

import v3 from '../v3/index.js';

/**
 *
 * @param server
 */
export default function (server: McpServer) {
	server.tool(
		'create_block_v3',
		'Create a block in BurgerEditor v3',
		{
			blockName: v3.blockNameSchema,
			data: z
				.array(z.record(z.string(), z.any()))
				.describe(
					'The data of the block. If `[["param1", "param2"], ["param3", "param4"]]`, request `[{"param1": "value1", "param2": "value2"}, {"param3": "value3", "param4": "value4"}]`.',
				),
		},
		({ blockName, data }) => {
			const html = v3.createBlock(blockName, data);
			return {
				content: [
					{
						type: 'text',
						text: html,
					},
				],
			};
		},
	);
}
