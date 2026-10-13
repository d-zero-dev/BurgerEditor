import type { RouterOptions } from './router.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { agentTools, toAgentError } from '@burger-editor/cli';

import { routeToolCall } from './router.js';

/**
 * Register every `agentTools` entry (`@burger-editor/cli`) as an MCP tool.
 * A successful call's structured payload gets `appliedTo` merged in for
 * every tool EXCEPT read-only ones: `appliedTo` is meaningful only where a
 * mutation could have landed in the browser or on disk, not on a plain
 * read, so adding it to a read-only tool's response would just be a field
 * nobody asked for. A thrown error (from `run()`, `readToken`
 * verification, or the router's own `local-unreachable`) becomes
 * `isError: true` with `agentErrorSchema`'s shape — the wire contract every
 * agent-tool failure shares regardless of which layer raised it. Every
 * `AgentTool.run()` throws rather than returning a failure shape for this
 * reason (see `defineAgentTool` in `@burger-editor/cli`'s `types.ts`).
 * @param server
 * @param options
 */
export function registerAgentTools(server: McpServer, options: RouterOptions): void {
	for (const tool of agentTools) {
		server.registerTool(
			tool.name,
			{
				description: tool.description,
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- AgentTool erases to unknown at the array boundary (see defineAgentTool); the MCP SDK's own AnySchema union needs the cast back.
				inputSchema: tool.input as any,
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				...(tool.output && { outputSchema: tool.output as any }),
				annotations: tool.annotations,
			},
			async (args: unknown) => {
				try {
					const { result, appliedTo } = await routeToolCall(tool, args, options);
					const structured =
						!tool.annotations.readOnlyHint && result && typeof result === 'object'
							? { ...result, appliedTo }
							: result;
					return {
						content: [
							{ type: 'text' as const, text: JSON.stringify(structured, null, 2) },
						],
						...(tool.output && {
							structuredContent: structured as Record<string, unknown>,
						}),
					};
				} catch (error) {
					const payload = toAgentError(error).toPayload();
					return {
						content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }],
						isError: true,
					};
				}
			},
		);
	}
}
