import type { RouterOptions } from './router.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { registerAgentTools } from './register-agent-tools.js';
import createBlockV3 from './tools/create-block-v3.js';
import getBlockDataParamsV3 from './tools/get-block-data-params-v3.js';
import getBlockType from './tools/get-block-type.js';

/**
 * Register every tool this server exposes — the v3 compatibility tools plus
 * the agent tools from `@burger-editor/cli` — on `server`.
 * @param server
 * @param options
 * @example
 * ```ts
 * const server = new McpServer({ name: 'burger-editor', version: '0.0.0' });
 * registerTools(server, { mode: 'disk', localUrl: 'http://localhost:5255' });
 * ```
 */
export function registerTools(server: McpServer, options: RouterOptions) {
	getBlockType(server);
	getBlockDataParamsV3(server);
	createBlockV3(server);
	registerAgentTools(server, options);
}
