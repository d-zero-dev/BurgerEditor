import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import v3 from '../v3/index.js';

/**
 *
 * @param server
 */
export default function (server: McpServer) {
	server.tool(
		'get_block_data_params_v3',
		'Get the data params of a block in BurgerEditor v3; If `[["param1", "param2"], ["param3", "param4"]]`, request `[{"param1": "value1", "param2": "value2"}, {"param3": "value3", "param4": "value4"}]`.',
		{
			blockName: v3.blockNameSchema,
		},
		({ blockName }) => {
			const params = v3.getItemParams(blockName);
			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify(params, null, 2),
					},
				],
			};
		},
	);
}
