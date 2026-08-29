import { NoEditableAreaError } from '@burger-editor/core';
import { PathOutsideDocumentRootError } from '@burger-editor/file-io';
import { z } from 'zod';

import { PageAlreadyExistsError } from '../handlers.js';

/**
 * Wire shape for every agent-tool failure — MCP tool errors and
 * `local`'s `POST /api/agent/invoke` share it. `error` is a short machine
 * code (`stale`, `exists`, `range`, …); `message` restates the situation as
 * an instruction — what happened AND what to do about it — because a
 * stopped agent reads the error, not the description, on the very next
 * turn. `next` / `readToken` / `currentBlocks` are populated when the
 * failure has an obvious recovery (see `read-token.ts`'s `buildRecovery`),
 * so the agent can retry without another round trip just to re-read state.
 * @example
 * ```ts
 * const payload = agentErrorSchema.parse(await res.json());
 * if (payload.error === 'stale') retryWith(payload.readToken);
 * ```
 */
export const agentErrorSchema = z.object({
	error: z.string(),
	message: z.string(),
	next: z.array(z.string()).optional(),
	readToken: z.string().optional(),
	currentBlocks: z
		.array(
			z.object({
				index: z.number().int().nonnegative(),
				id: z.string().nullable(),
				text: z.string(),
			}),
		)
		.optional(),
});

export type AgentErrorPayload = z.infer<typeof agentErrorSchema>;

export interface AgentErrorExtra {
	readonly next?: readonly string[];
	readonly readToken?: string;
	readonly currentBlocks?: AgentErrorPayload['currentBlocks'];
}

/**
 * A tool failure with a machine-readable `code` an agent (or the router
 * relaying between mcp-server / local) can branch on, distinct from a raw
 * `Error` whose `message` is meant for humans only.
 * @example
 * ```ts
 * throw new AgentError('invalid', 'filter.regex is not a valid pattern.', {
 *   next: ['Fix the pattern and call page_blocks again.'],
 * });
 * ```
 */
export class AgentError extends Error {
	readonly code: string;
	readonly extra: AgentErrorExtra;

	constructor(code: string, message: string, extra: AgentErrorExtra = {}) {
		super(message);
		this.name = 'AgentError';
		this.code = code;
		this.extra = extra;
	}

	toPayload(): AgentErrorPayload {
		return {
			error: this.code,
			message: this.message,
			...(this.extra.next && { next: [...this.extra.next] }),
			...(this.extra.readToken && { readToken: this.extra.readToken }),
			...(this.extra.currentBlocks && { currentBlocks: this.extra.currentBlocks }),
		};
	}
}

/**
 * Map a thrown value from a tool's `run()` to an `AgentError`. Handlers
 * throw ordinary `Error` subtypes (`PageAlreadyExistsError`,
 * `NoEditableAreaError`, `RangeError`, Node `ENOENT`) because they have no
 * notion of the agent wire protocol — this is the one place that
 * translates disk-layer exceptions into the codes `agentErrorSchema`
 * promises.
 * @param error
 * @example
 * ```ts
 * const agentError = toAgentError(new RangeError('Block index 9 out of range'));
 * agentError.code; // 'range'
 * ```
 */
export function toAgentError(error: unknown): AgentError {
	if (error instanceof AgentError) {
		return error;
	}
	if (error instanceof PageAlreadyExistsError) {
		return new AgentError('exists', error.message);
	}
	if (error instanceof NoEditableAreaError) {
		return new AgentError('no-such-area', error.message);
	}
	if (error instanceof PathOutsideDocumentRootError) {
		// Deliberately the same `invalid` code a schema failure gets — the
		// caller learns the path is unusable, not where documentRoot is.
		return new AgentError('invalid', error.message);
	}
	if (error instanceof RangeError) {
		return new AgentError('range', error.message);
	}
	if (
		error instanceof Error &&
		'code' in error &&
		(error as NodeJS.ErrnoException).code === 'ENOENT'
	) {
		return new AgentError('not-found', error.message);
	}
	if (error instanceof Error) {
		return new AgentError('invalid', error.message);
	}
	return new AgentError('invalid', String(error));
}
