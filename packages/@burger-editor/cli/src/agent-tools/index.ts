import type { AgentTool } from './types.js';

import {
	blockDeleteTool,
	blockDuplicateTool,
	blockEnsureIdTool,
	blockGetTool,
	blockInsertTool,
	blockMoveTool,
	blockReplaceTool,
	itemUpdateTool,
	pageUpdateTool,
} from './tools/block.js';
import {
	catalogGetTool,
	catalogListTool,
	containerOptionsListTool,
	itemListTool,
	itemSchemaTool,
	styleOptionsListTool,
} from './tools/catalog.js';
import { configResolveTool } from './tools/config.js';
import { editorStateGetTool, editorWaitForEventTool } from './tools/editor.js';
import { frontMatterGetTool, frontMatterSetTool } from './tools/front-matter.js';
import { pageBlocksTool } from './tools/page-blocks.js';
import {
	pageConcatTool,
	pageCopyTool,
	pageCreateTool,
	pageDeleteTool,
	pageGetTool,
	pageListTool,
	pageRenameTool,
} from './tools/page.js';

/**
 * Every tool BurgerEditor exposes to an agent, in one array — the single
 * source both registration sites import: `@burger-editor/mcp-server`
 * (stdio, disk/auto/local mode) and `@burger-editor/local`'s
 * `POST /api/agent/invoke`. See `types.ts` for why one definition per tool
 * is load-bearing: it's what keeps the contract identical across every
 * surface an agent might be talking to.
 * @example
 * ```ts
 * for (const tool of agentTools) {
 *   server.registerTool(tool.name, { description: tool.description, inputSchema: tool.input }, ...);
 * }
 * ```
 */
export const agentTools: readonly AgentTool<unknown, unknown>[] = [
	pageListTool,
	pageGetTool,
	pageBlocksTool,
	blockGetTool,
	blockInsertTool,
	blockReplaceTool,
	blockDeleteTool,
	blockMoveTool,
	blockDuplicateTool,
	blockEnsureIdTool,
	itemUpdateTool,
	pageUpdateTool,
	pageCreateTool,
	pageDeleteTool,
	pageRenameTool,
	pageCopyTool,
	pageConcatTool,
	frontMatterGetTool,
	frontMatterSetTool,
	catalogListTool,
	catalogGetTool,
	itemListTool,
	itemSchemaTool,
	styleOptionsListTool,
	containerOptionsListTool,
	configResolveTool,
	editorStateGetTool,
	editorWaitForEventTool,
];

export type { AgentTool, AgentToolAnnotations } from './types.js';
export { defineAgentTool } from './types.js';
export { AgentError, agentErrorSchema, toAgentError } from './errors.js';
export type { AgentErrorPayload } from './errors.js';
export { agentInstructions } from './instructions.js';
export {
	computeContentHash,
	decodeReadToken,
	encodeReadToken,
	issueReadToken,
	requireReadToken,
	verifyReadToken,
} from './read-token.js';
export type { ReadTokenPayload, ReadTokenVerifyResult } from './read-token.js';
export { blockOpSchema } from './block-op.js';
export type { BlockOp } from './block-op.js';
export { applyBlockOpToHtml } from './apply-block-op.js';
export { summarizeBlock } from './block-summary.js';
export type { BlockHeadingSummary, BlockSummary } from './block-summary.js';
