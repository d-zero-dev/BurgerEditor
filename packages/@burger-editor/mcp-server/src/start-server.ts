import type { RouterOptions } from './router.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';

import { registerTools } from './register-tools.js';
import { createServer } from './server.js';

/**
 * Build a fresh `McpServer`, register every tool on it and connect it to
 * `transport`. Disposing the returned handle calls `server.close()`, which
 * also closes `transport`. In-flight tool calls are not awaited or cancelled
 * by that close (SDK behavior): one already past its argument parsing can
 * still write to disk or the local server, and its response is dropped.
 *
 * If registration or `connect()` throws, the half-started server is closed
 * before the error propagates, since the caller never receives a handle.
 *
 * `run()` is this plus argv parsing and a stdio transport; tests drive this
 * directly with an `InMemoryTransport` so the boot/shutdown cycle runs
 * in-process without touching the worker's real stdin/stdout.
 * @param options Routing mode and local server URL, as parsed by `parseRouterOptions`.
 * @param transport The MCP transport to serve on (stdio in production, in-memory in tests).
 */
export async function startServer(
	options: RouterOptions,
	transport: Transport,
): Promise<AsyncDisposable> {
	const server = createServer();
	try {
		registerTools(server, options);
		await server.connect(transport);
	} catch (error) {
		await server.close();
		throw error;
	}
	return {
		[Symbol.asyncDispose]: () => server.close(),
	};
}
