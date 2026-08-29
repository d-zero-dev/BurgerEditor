import type { CliContext } from '../context.js';
import type { AgentErrorPayload } from './errors.js';

import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';

import { NoEditableAreaError, listBlocks } from '@burger-editor/core';
import { loadContent, resolvePathInput } from '@burger-editor/file-io';

import { summarizeBlock } from './block-summary.js';
import { AgentError } from './errors.js';

export interface ReadTokenPayload {
	readonly path: string;
	readonly contentHash: string;
}

/**
 * Hash the whole file on disk — Front Matter included — so a `readToken`
 * goes stale on ANY change to the page, not just an edit inside the
 * editable area. Sixteen hex chars (64 bits) of SHA-256 is far more than
 * enough collision resistance for "did this exact file change since I last
 * read it" against a filesystem, not an adversary; the token isn't signed
 * (see `AgentError` docs on why "read-then-write" is enforced as a
 * procedure, not a security boundary).
 * @param filePath absolute path to the file on disk
 * @example
 * ```ts
 * const hash = await computeContentHash('/srv/site/about.html'); // 'a3f9…' (16 hex chars)
 * ```
 */
export async function computeContentHash(filePath: string): Promise<string> {
	const buf = await fs.readFile(filePath);
	return createHash('sha256').update(buf).digest('hex').slice(0, 16);
}

/**
 * Serialize a `ReadTokenPayload` into the opaque base64 string agents pass
 * around as `readToken`. Base64 JSON rather than a bare hash so the token
 * carries the path it was minted for (see `issueReadToken`).
 * @param payload
 * @example
 * ```ts
 * const token = encodeReadToken({ path: 'about.html', contentHash: 'a3f9b2c1d4e5f607' });
 * ```
 */
export function encodeReadToken(payload: ReadTokenPayload): string {
	return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
}

/**
 * Parse a `readToken` back into its payload, returning `null` for anything
 * that is not base64 JSON with both `path` and `contentHash` strings —
 * callers report that as `malformed` rather than crashing on agent input.
 * @param token
 * @example
 * ```ts
 * decodeReadToken(token); // { path: 'about.html', contentHash: 'a3f9b2c1d4e5f607' }
 * decodeReadToken('not-a-token'); // null
 * ```
 */
export function decodeReadToken(token: string): ReadTokenPayload | null {
	try {
		const parsed: unknown = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
		if (
			parsed &&
			typeof parsed === 'object' &&
			typeof (parsed as ReadTokenPayload).path === 'string' &&
			typeof (parsed as ReadTokenPayload).contentHash === 'string'
		) {
			return parsed as ReadTokenPayload;
		}
		return null;
	} catch {
		return null;
	}
}

/**
 * Issue a `readToken` bound to `pathInput` (the string the agent used to
 * address the page) and the current on-disk content hash. `pathInput`,
 * not the resolved disk path, is embedded — a `stale`/`read-required`
 * response can then reject a token minted for a different path string even
 * if it happens to resolve to the same file, catching a copy-pasted token
 * from another call.
 * @param pathInput
 * @param filePath
 * @example
 * ```ts
 * const readToken = await issueReadToken('about.html', '/srv/site/about.html');
 * return { blockCount, readToken };
 * ```
 */
export async function issueReadToken(
	pathInput: string,
	filePath: string,
): Promise<string> {
	const contentHash = await computeContentHash(filePath);
	return encodeReadToken({ path: pathInput, contentHash });
}

export type ReadTokenVerifyResult =
	| { readonly ok: true }
	| {
			readonly ok: false;
			readonly reason: 'missing' | 'malformed' | 'wrong-path' | 'stale';
	  };

/**
 * Verify a `readToken` against `pathInput` + the current on-disk content.
 * Does not throw — callers decide how to report `missing` (400
 * `read-required`) vs the rest (409 `stale`); see `requireReadToken` for the
 * throwing convenience most tools use directly.
 * @param token
 * @param pathInput
 * @param filePath
 * @example
 * ```ts
 * const result = await verifyReadToken(token, 'about.html', '/srv/site/about.html');
 * if (!result.ok && result.reason === 'stale') reReadPage(); // page changed since the read
 * ```
 */
export async function verifyReadToken(
	token: string | undefined,
	pathInput: string,
	filePath: string,
): Promise<ReadTokenVerifyResult> {
	if (!token) {
		return { ok: false, reason: 'missing' };
	}
	const payload = decodeReadToken(token);
	if (!payload) {
		return { ok: false, reason: 'malformed' };
	}
	if (payload.path !== pathInput) {
		return { ok: false, reason: 'wrong-path' };
	}
	const currentHash = await computeContentHash(filePath);
	if (payload.contentHash !== currentHash) {
		return { ok: false, reason: 'stale' };
	}
	return { ok: true };
}

/**
 * Build the recovery payload attached to a `read-required` / `stale`
 * error: a fresh `readToken` for immediate reuse, plus a peek at the
 * page's current blocks (capped — see `page_blocks` for the full,
 * paginated read) so an agent can retry with `target.id` instead of an
 * `index` that may have shifted, without a separate round trip.
 * @param ctx
 * @param pathInput
 * @param filePath
 */
async function buildRecovery(
	ctx: CliContext,
	pathInput: string,
	filePath: string,
): Promise<Pick<AgentErrorPayload, 'currentBlocks' | 'readToken'>> {
	const readToken = await issueReadToken(pathInput, filePath);
	const result = await loadContent(filePath, ctx.config.editableArea, '').catch(
		() => null,
	);
	if (!result || result instanceof NoEditableAreaError) {
		return { readToken };
	}
	const blocks = listBlocks(result.editableContent, null);
	if (blocks instanceof NoEditableAreaError) {
		return { readToken };
	}
	const RECOVERY_BLOCK_LIMIT = 20;
	const currentBlocks = blocks.slice(0, RECOVERY_BLOCK_LIMIT).map((block) => {
		const summary = summarizeBlock(block);
		return { index: summary.index, id: summary.id, text: summary.text };
	});
	return { readToken, currentBlocks };
}

/**
 * Enforce the "read before you write" contract every mutation on an
 * existing page must pass: throws `AgentError('read-required', …)` when no
 * token was supplied, or `AgentError('stale', …)` when the token doesn't
 * match `pathInput` + the page's current content. Both carry a fresh
 * `readToken` and a `currentBlocks` peek (`buildRecovery`) so the agent's
 * very next call can retry without re-reading from scratch.
 * @param ctx
 * @param pathInput
 * @param token
 * @example
 * ```ts
 * await requireReadToken(ctx, args.path, args.readToken); // throws AgentError on failure
 * const html = await deleteBlockOnDisk(ctx, args.path, args.index);
 * ```
 */
export async function requireReadToken(
	ctx: CliContext,
	pathInput: string,
	token: string | undefined,
): Promise<void> {
	const filePath = resolvePathInput(pathInput, ctx.config, ctx.resolverState);
	const result = await verifyReadToken(token, pathInput, filePath);
	if (result.ok) {
		return;
	}
	const recovery = await buildRecovery(ctx, pathInput, filePath);
	if (result.reason === 'missing') {
		throw new AgentError(
			'read-required',
			`This mutation requires a readToken. Call page_blocks({ path: ${JSON.stringify(pathInput)} }) first and pass the returned readToken.`,
			recovery,
		);
	}
	throw new AgentError(
		'stale',
		'The page changed since this readToken was issued (or it was minted for a different path). ' +
			'Re-read with page_blocks and retry using currentBlocks below, or pass target.id instead of index.',
		recovery,
	);
}
