import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import server from './server.js';
import createBlockV3 from './tools/create-block-v3.js';
import getBlockDataParamsV3 from './tools/get-block-data-params-v3.js';
import getBlockType from './tools/get-block-type.js';
import registerV4Tools from './tools/v4.js';

/**
 *
 * @param server
 */
function registerTools(server: McpServer) {
	getBlockType(server);
	getBlockDataParamsV3(server);
	createBlockV3(server);
	registerV4Tools(server);
}

/**
 * Boot the MCP server over stdio.
 *
 * stdout is the MCP protocol channel — never write to it from here.
 * stderr is safe: MCP host clients (Claude Code, Claude Desktop, Cursor)
 * capture and surface server stderr in their logs, so explicit startup
 * messages there give operators a way to confirm the server actually
 * started instead of crashing silently.
 *
 * Any error during registration or transport connect is logged to stderr
 * with context (which phase failed) and re-thrown so the parent process
 * sees a non-zero exit. The previous bare `await run()` would still exit
 * non-zero on throw, but with no breadcrumb identifying WHICH stage broke.
 */
export async function run() {
	const startedAt = process.hrtime.bigint();
	try {
		process.stderr.write(`[burger-editor mcp] starting (pid ${process.pid})\n`);
		registerTools(server);
		// `server.listTools()` from outside isn't on the public API at this
		// point in startup, so we don't enumerate tools here — but the
		// registration calls above are synchronous and any registration
		// failure would have thrown by now.
		const transport = new StdioServerTransport();
		await server.connect(transport);
		const ms = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
		process.stderr.write(
			`[burger-editor mcp] ready on stdio (boot ${ms.toFixed(0)}ms) — ` +
				`v3 + v4 tools registered\n`,
		);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		const stack = error instanceof Error && error.stack ? `\n${error.stack}` : '';
		process.stderr.write(
			`[burger-editor mcp] FATAL during startup: ${message}${stack}\n`,
		);
		throw error;
	}
}
