import type { BlockOp } from '@burger-editor/cli/block-op';

import { blockOpSchema } from '@burger-editor/cli/block-op';
import { z } from 'zod';

// A dedicated subpath, not `@burger-editor/cli`'s main entry — that entry
// re-exports `handlers.ts`, which pulls in Node built-ins (`node:fs`,
// `node:crypto`, …) that break `vite build`'s browser bundle for
// `client/create-editor.ts` (this module's only browser-side consumer, via
// `client/agent-link.ts`). `./block-op` only depends on `@burger-editor/core`
// (already browser-safe) and `zod`.

/**
 * The `/ws/editor` wire protocol shared by `local`'s server (`agent/tab-hub.ts`,
 * `agent/route.ts`) and browser (`client/agent-link.ts`, `client/ws-transport.ts`).
 * Kept in `local` rather than `cli` — unlike `BlockOp`, nothing outside a
 * running `local` process (disk-mode mcp-server, the CLI) ever needs these
 * shapes, so there's no reason to put them in the package `cli` doesn't
 * depend back on.
 */

export const uiOpenDialogSchema = z
	.enum(['block-catalog', 'block-options', 'item-editor'])
	.nullable();

const uiStateFieldsSchema = z.object({
	openDialog: uiOpenDialogSchema,
	sourceMode: z.boolean(),
	processing: z.boolean(),
	editingBlockIndex: z.number().int().nonnegative().nullable(),
});

export const browserToServerMessageSchema = z.discriminatedUnion('type', [
	z.object({
		type: z.literal('hello'),
		page: z.string(),
		revision: z.number().int().nonnegative(),
		serverSession: z.string(),
		uiState: uiStateFieldsSchema,
	}),
	z.object({ type: z.literal('focus') }),
	z.object({ type: z.literal('ui-state') }).merge(uiStateFieldsSchema),
	z.object({
		type: z.literal('switch-content'),
		area: z.enum(['main', 'draft']),
	}),
	z.object({ type: z.literal('saved'), revision: z.number().int().nonnegative() }),
	z.object({
		type: z.literal('ack'),
		id: z.string(),
		revision: z.number().int().nonnegative(),
		html: z.string(),
	}),
	z.object({
		type: z.literal('nack'),
		id: z.string(),
		reason: z.enum([
			'user-editing',
			'stale',
			'range',
			'no-such-area',
			'disabled-block',
			'processing-timeout',
		]),
		detail: z.unknown().optional(),
	}),
	z.object({ type: z.literal('pong') }),
]);

export type BrowserToServerMessage = z.infer<typeof browserToServerMessageSchema>;
export type UIState = z.infer<typeof uiStateFieldsSchema>;

export interface ApplyMessage {
	readonly type: 'apply';
	readonly id: string;
	readonly area: 'main' | 'draft';
	readonly op: BlockOp;
	readonly baseRevision: number;
	readonly revision: number;
	readonly highlight: boolean;
}

export interface WelcomeMessage {
	readonly type: 'welcome';
	readonly sessionId: string;
	readonly revision: number;
}

export interface CommittedMessage {
	readonly type: 'committed';
	readonly revision: number;
}

export type ReloadReason =
	'behind' | 'other-tab' | 'front-matter' | 'server-restart' | 'external-change';

export interface ReloadMessage {
	readonly type: 'reload';
	readonly revision: number;
	readonly reason: ReloadReason;
}

export interface PageEventMessage {
	readonly type: 'page-event';
	readonly kind: 'created' | 'deleted' | 'renamed';
	readonly from?: string;
	readonly to?: string;
}

export interface PingMessage {
	readonly type: 'ping';
}

/** Everything the server can push down `/ws/editor` to a browser tab. */
export type ServerToBrowserMessage =
	| ApplyMessage
	| WelcomeMessage
	| CommittedMessage
	| ReloadMessage
	| PageEventMessage
	| PingMessage;

const reloadReasonSchema = z.enum([
	'behind',
	'other-tab',
	'front-matter',
	'server-restart',
	'external-change',
]);

/** Runtime counterpart of {@link ServerToBrowserMessage}, for the browser side (`client/agent-link.ts`) to validate an incoming frame before acting on it. */
export const serverToBrowserMessageSchema = z.discriminatedUnion('type', [
	z.object({
		type: z.literal('apply'),
		id: z.string(),
		area: z.enum(['main', 'draft']),
		op: blockOpSchema,
		baseRevision: z.number().int().nonnegative(),
		revision: z.number().int().nonnegative(),
		highlight: z.boolean(),
	}),
	z.object({
		type: z.literal('welcome'),
		sessionId: z.string(),
		revision: z.number().int().nonnegative(),
	}),
	z.object({ type: z.literal('committed'), revision: z.number().int().nonnegative() }),
	z.object({
		type: z.literal('reload'),
		revision: z.number().int().nonnegative(),
		reason: reloadReasonSchema,
	}),
	z.object({
		type: z.literal('page-event'),
		kind: z.enum(['created', 'deleted', 'renamed']),
		from: z.string().optional(),
		to: z.string().optional(),
	}),
	z.object({ type: z.literal('ping') }),
]);

// `export … from` here (which `unicorn/prefer-export-from` otherwise
// autofixes this into) breaks `import-x/named` for `BlockOp` — it can't
// follow `@burger-editor/cli/block-op`'s own `export type { BlockOp } from
// '@burger-editor/core'` re-export through a SECOND `export … from` hop.
// eslint-disable-next-line unicorn/prefer-export-from
export type { BlockOp };
