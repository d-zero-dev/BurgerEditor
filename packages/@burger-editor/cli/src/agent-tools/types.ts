import type { CliContext } from '../context.js';
import type { z } from 'zod';

import { toAgentError } from './errors.js';

/**
 * MCP tool annotation hints (`ToolAnnotations` in the MCP SDK) surfaced on
 * every agent tool so a host UI / policy layer can distinguish read-only,
 * destructive, and idempotent calls without parsing descriptions.
 */
export interface AgentToolAnnotations {
	readonly readOnlyHint?: boolean;
	readonly destructiveHint?: boolean;
	readonly idempotentHint?: boolean;
}

/**
 * A tool definition shared by every surface that exposes BurgerEditor to an
 * agent. Two surfaces register from it: `@burger-editor/mcp-server` (stdio,
 * `disk` / `auto` mode routed by `mcp-server/src/router.ts`) and
 * `@burger-editor/local`'s `POST /api/agent/invoke`; both import
 * `agentTools` rather than declaring tools of their own. `run` is always
 * the disk implementation — whichever surface owns dispatch decides whether
 * to call it directly or route the mutation to a connected browser tab
 * first.
 *
 * Keeping ONE definition per tool (name, schema, description, annotations,
 * disk behaviour) guarantees the contract an agent sees is identical
 * regardless of which surface answered the call — the mode a call was
 * served from is informational only (`appliedTo` on the result), never a
 * reason for the agent to change what it does next.
 * @example
 * ```ts
 * const tool = agentTools.find((t) => t.name === 'page_blocks')!;
 * const result = await tool.run(ctx, { path: 'about.html' });
 * ```
 */
export interface AgentTool<Input = unknown, Output = unknown> {
	readonly name: string;
	/** Kept to 3 lines or fewer: when to use it, when not to, what to call next. */
	readonly description: string;
	readonly input: z.ZodType<Input>;
	readonly output?: z.ZodType<Output>;
	readonly annotations: AgentToolAnnotations;
	run(ctx: CliContext, args: Input): Promise<Output>;
}

/**
 * Widen a concrete `AgentTool<Input, Output>` to the `unknown`-typed shape
 * `agentTools` is collected as, AND wrap `run` so every tool's failure exits
 * through `toAgentError` — regardless of whether the individual tool module
 * threw an `AgentError` itself (`requireReadToken`) or let a disk-layer
 * exception (`PageAlreadyExistsError`, `NoEditableAreaError`, a raw
 * `RangeError`) bubble up untouched. Without this, only the tools that
 * happen to call `requireReadToken` would produce `agentErrorSchema`-shaped
 * failures, and every caller of `run()` (the MCP layer, `local`, tests)
 * would need its own `toAgentError` catch instead of getting the same
 * guarantee for free at the one place `run` is defined.
 * @param tool
 * @example
 * ```ts
 * export const pingTool = defineAgentTool({
 *   name: 'ping',
 *   description: 'Health check.',
 *   input: z.object({}),
 *   annotations: { readOnlyHint: true },
 *   async run() { return { ok: true }; },
 * });
 * ```
 */
export function defineAgentTool<Input, Output>(
	tool: AgentTool<Input, Output>,
): AgentTool<unknown, unknown> {
	return {
		...tool,
		async run(ctx, args) {
			try {
				return await tool.run(ctx, args as Input);
			} catch (error) {
				throw toAgentError(error);
			}
		},
	} as AgentTool<unknown, unknown>;
}
