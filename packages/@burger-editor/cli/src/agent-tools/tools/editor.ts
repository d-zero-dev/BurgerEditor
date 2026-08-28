import { z } from 'zod';

import { AgentError } from '../errors.js';
import { defineAgentTool } from '../types.js';

/**
 * `run` on both editor_* tools is what serves a call when no `local` dev
 * server answered — see `mcp-server/src/router.ts` for the routing that
 * calls `run` only in that situation. `editor_state_get` degrades to an
 * empty session list rather than erroring: "no browser tabs open" is valid,
 * useful information in disk mode, unlike `editor_wait_for_event`, which
 * has nothing to wait ON without a live server.
 */
const sessionSchema = z.object({
	page: z.string(),
	revision: z.number(),
	uiState: z.unknown(),
	connectedAt: z.number(),
});

const editorStateGetOutput = z.object({
	mode: z.enum(['disk', 'local']),
	sessions: z.array(sessionSchema),
});

export const editorStateGetTool = defineAgentTool({
	name: 'editor_state_get',
	description:
		'Get open editor tabs and their state (mode, revision, ui state). Read-only. In disk ' +
		'mode (no local dev server reachable), returns an empty session list rather than erroring.',
	input: z.object({}),
	output: editorStateGetOutput,
	annotations: { readOnlyHint: true },
	run() {
		return Promise.resolve({ mode: 'disk' as const, sessions: [] });
	},
});

export const editorWaitForEventTool = defineAgentTool({
	name: 'editor_wait_for_event',
	description:
		'Long-poll for editor events (ui-state changes, saves, page events). Requires the ' +
		'local dev server — fails with local-required in disk mode; use editor_state_get instead.',
	input: z.object({
		since: z.number().int().nonnegative().optional(),
		types: z.array(z.string()).optional(),
		timeoutMs: z.number().int().positive().optional(),
	}),
	annotations: { readOnlyHint: true },
	run() {
		return Promise.reject(
			new AgentError(
				'local-required',
				'editor_wait_for_event requires the local dev server (`npx bge`). ' +
					'Start it, or use editor_state_get for a one-shot check in disk mode.',
			),
		);
	},
});
