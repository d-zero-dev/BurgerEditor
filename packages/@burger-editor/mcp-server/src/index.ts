import type { McpMode, RouterOptions } from './router.js';

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { startServer } from './start-server.js';

export { registerTools } from './register-tools.js';

const MODES: readonly McpMode[] = ['auto', 'local', 'disk'];
const DEFAULT_LOCAL_URL = 'http://localhost:5255';

/**
 * `--mode` (`BGE_MCP_MODE`, default `auto`), `--url` (`BGE_LOCAL_URL`,
 * default `http://localhost:5255`) and `--config` (`BGE_CONFIG`, default:
 * search for `burgereditor.config.*`) are the only flags this server takes.
 * CLI flags win over environment variables so a one-off override doesn't
 * require touching the host config's env block. `BGE_CONFIG` is not read
 * here but by `resolveConfig` (`@burger-editor/file-io`) itself, so the
 * same variable also reaches `@burger-editor/cli` and `@burger-editor/local`.
 * @param argv
 * @throws {Error} when `--mode` is not a known mode, or `--config` has no path after it
 * @example
 * ```ts
 * parseRouterOptions(['--mode', 'local', '--config', './burgereditor.child.config.js']);
 * // → { mode: 'local', localUrl: 'http://localhost:5255', configPath: './burgereditor.child.config.js' }
 * ```
 */
export function parseRouterOptions(argv: readonly string[]): RouterOptions {
	let mode = (process.env.BGE_MCP_MODE as McpMode | undefined) ?? 'auto';
	let localUrl = process.env.BGE_LOCAL_URL ?? DEFAULT_LOCAL_URL;
	let configPath: string | undefined;
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === '--mode' && argv[i + 1]) {
			mode = argv[i + 1] as McpMode;
			i++;
		} else if (argv[i] === '--url' && argv[i + 1]) {
			localUrl = argv[i + 1]!;
			i++;
		} else if (argv[i] === '--config') {
			// Unlike --mode/--url, a missing path is fatal rather than skipped:
			// silently ignoring it would run against the searched config, i.e.
			// possibly another site's. A following flag is not a path either.
			const next = argv[i + 1];
			if (!next || next.startsWith('-')) {
				throw new Error('--config requires a path to a config file.');
			}
			configPath = next;
			i++;
		}
	}
	if (!MODES.includes(mode)) {
		throw new Error(`Invalid --mode "${mode}" — expected one of: ${MODES.join(', ')}.`);
	}
	return { mode, localUrl, configPath };
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
 * sees a non-zero exit. A bare throw would exit non-zero too, but with no
 * breadcrumb identifying WHICH stage broke.
 *
 * Disposing the returned handle closes the server and its stdio transport,
 * which removes the transport's stdin listeners (stdin is paused only when
 * no other `data` listener remains, so an embedder's own stdin reader keeps
 * the process alive). In-flight tool calls are not awaited — see
 * `startServer`. No SIGINT/SIGTERM handler is installed: stdin is the only
 * resource held and nothing is buffered for flushing, so Node's default
 * signal exit loses nothing, whereas a handler would have to call
 * `process.exit` itself and own the exit code.
 * @example
 * ```ts
 * const handle = await run();
 * // ...when the embedding process wants the server gone:
 * await handle[Symbol.asyncDispose]();
 * ```
 */
export async function run(): Promise<AsyncDisposable> {
	const startedAt = process.hrtime.bigint();
	try {
		const options = parseRouterOptions(process.argv.slice(2));
		const configLabel = options.configPath ? `, config=${options.configPath}` : '';
		process.stderr.write(
			`[burger-editor mcp] starting (pid ${process.pid}, mode=${options.mode}, url=${options.localUrl}${configLabel})\n`,
		);
		const handle = await startServer(options, new StdioServerTransport());
		const ms = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
		process.stderr.write(
			`[burger-editor mcp] ready on stdio (boot ${ms.toFixed(0)}ms) — ` +
				`v3 + agent tools registered\n`,
		);
		return handle;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		const stack = error instanceof Error && error.stack ? `\n${error.stack}` : '';
		process.stderr.write(
			`[burger-editor mcp] FATAL during startup: ${message}${stack}\n`,
		);
		throw error;
	}
}
