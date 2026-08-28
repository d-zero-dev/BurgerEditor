import type { McpMode, RouterOptions } from './router.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { registerAgentTools } from './register-agent-tools.js';
import server from './server.js';
import createBlockV3 from './tools/create-block-v3.js';
import getBlockDataParamsV3 from './tools/get-block-data-params-v3.js';
import getBlockType from './tools/get-block-type.js';

const MODES: readonly McpMode[] = ['auto', 'local', 'disk'];
const DEFAULT_LOCAL_URL = 'http://localhost:5255';

/**
 * `--mode` (`BGE_MCP_MODE`, default `auto`) and `--url` (`BGE_LOCAL_URL`,
 * default `http://localhost:5255`) are the only flags this server takes.
 * CLI flags win over environment variables so a one-off override doesn't
 * require touching the host config's env block.
 * @param argv
 */
export function parseRouterOptions(argv: readonly string[]): RouterOptions {
	let mode = (process.env.BGE_MCP_MODE as McpMode | undefined) ?? 'auto';
	let localUrl = process.env.BGE_LOCAL_URL ?? DEFAULT_LOCAL_URL;
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === '--mode' && argv[i + 1]) {
			mode = argv[i + 1] as McpMode;
			i++;
		} else if (argv[i] === '--url' && argv[i + 1]) {
			localUrl = argv[i + 1]!;
			i++;
		}
	}
	if (!MODES.includes(mode)) {
		throw new Error(`Invalid --mode "${mode}" — expected one of: ${MODES.join(', ')}.`);
	}
	return { mode, localUrl };
}

/**
 *
 * @param server
 * @param options
 */
export function registerTools(server: McpServer, options: RouterOptions) {
	getBlockType(server);
	getBlockDataParamsV3(server);
	createBlockV3(server);
	registerAgentTools(server, options);
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
		const options = parseRouterOptions(process.argv.slice(2));
		process.stderr.write(
			`[burger-editor mcp] starting (pid ${process.pid}, mode=${options.mode}, url=${options.localUrl})\n`,
		);
		registerTools(server, options);
		const transport = new StdioServerTransport();
		await server.connect(transport);
		const ms = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
		process.stderr.write(
			`[burger-editor mcp] ready on stdio (boot ${ms.toFixed(0)}ms) — ` +
				`v3 + agent tools registered\n`,
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
