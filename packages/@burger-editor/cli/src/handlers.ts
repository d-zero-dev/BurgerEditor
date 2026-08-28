import type { BlockSpec } from './block-builder.js';
import type { CliContext } from './context.js';
import type { ItemData, ListedBlock } from '@burger-editor/core';

import { constants as fsConstants } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

import { items as defaultItems } from '@burger-editor/blocks';
import {
	BurgerEditorEngine,
	NoEditableAreaError,
	deleteBlock,
	duplicateBlock,
	insertBlock,
	itemExport,
	itemImport,
	listBlocks,
	moveBlock,
	parseFrontMatter,
	replaceBlock,
	stringifyWithFrontMatter,
} from '@burger-editor/core';
import {
	generateFileTree,
	loadContent,
	resolvePathInput,
	saveContent,
} from '@burger-editor/file-io';
import { parseFields } from '@burger-editor/frozen-patty/parse-fields';

import { renderBlockHtml } from './block-builder.js';

/**
 *
 * @param input
 * @param ctx
 */
function expectPath(input: string, ctx: CliContext): string {
	return resolvePathInput(input, ctx.config, ctx.resolverState);
}

/**
 * Thrown when a page-creating operation's destination already exists on
 * disk. A distinct error class (rather than a generic `Error` with a
 * matching message) lets `cli/src/agent-tools` map this to HTTP 409 `exists`
 * by type instead of pattern-matching on message text.
 */
export class PageAlreadyExistsError extends Error {
	readonly pathInput: string;
	constructor(pathInput: string) {
		super(`Page already exists: ${pathInput}`);
		this.pathInput = pathInput;
	}
}

// ---------------------------------------------------------------- pages ----

/**
 *
 * @param ctx
 */
export async function pageList(ctx: CliContext) {
	const tree = await generateFileTree(ctx.config.documentRoot);
	// Surface files that couldn't be registered into the virtual-path
	// resolver (missing / malformed Front Matter, etc.). Without this an
	// agent has no way to know which legacy / pre-conversion files exist —
	// they'd just disappear from the agent's view of the project.
	return {
		tree,
		documentRoot: ctx.config.documentRoot,
		invalidPages: ctx.invalidPages,
	};
}

/**
 *
 * @param ctx
 * @param pathInput
 */
export async function pageGet(ctx: CliContext, pathInput: string) {
	const filePath = expectPath(pathInput, ctx);
	const raw = await fs.readFile(filePath, 'utf8');
	const parsed = parseFrontMatter(raw);
	return {
		path: pathInput,
		realPath: filePath,
		frontMatter: parsed.data,
		hasFrontMatter: parsed.hasFrontMatter,
		content: parsed.content,
	};
}

export interface PageCreateOptions {
	readonly frontMatter?: Record<string, unknown>;
	readonly blocks?: readonly BlockSpec[];
}

/**
 *
 * @param ctx
 * @param pathInput
 * @param options
 */
export async function pageCreate(
	ctx: CliContext,
	pathInput: string,
	options: PageCreateOptions = {},
) {
	const filePath = expectPath(pathInput, ctx);
	const template = ctx.config.newFileContent || '';

	// Atomically reserve the file: fs.writeFile with `wx` either creates it
	// (when missing) or rejects with EEXIST. This closes the race window
	// between access-check and write that two concurrent page_create calls
	// could exploit to both pass the check and clobber each other.
	await fs.mkdir(path.dirname(filePath), { recursive: true });
	try {
		await fs.writeFile(filePath, template, { encoding: 'utf8', flag: 'wx' });
	} catch (error: unknown) {
		if (error instanceof Error && 'code' in error && error.code === 'EEXIST') {
			throw new PageAlreadyExistsError(pathInput);
		}
		throw error;
	}

	// File now exists with the template contents — the subsequent loadContent
	// will just read it back, parse the Front Matter, and let us layer
	// requested frontMatter / initial blocks on top via saveContent.
	const result = await loadContent(filePath, ctx.config.editableArea, template);
	if (result instanceof NoEditableAreaError) {
		throw result;
	}
	const frontMatter = { ...result.frontMatter, ...options.frontMatter };
	let editableHtml = result.editableContent;
	if (options.blocks && options.blocks.length > 0) {
		const rendered = await Promise.all(
			options.blocks.map((spec) => renderBlockHtml(spec, ctx.config)),
		);
		editableHtml = (editableHtml ? editableHtml + '\n' : '') + rendered.join('\n');
	}
	await saveContent(
		filePath,
		editableHtml,
		ctx.config.editableArea,
		frontMatter,
		result.originalFrontMatter,
	);
	return { path: pathInput, realPath: filePath, created: true };
}

/**
 *
 * @param ctx
 * @param pathInput
 */
export async function pageDelete(ctx: CliContext, pathInput: string) {
	const filePath = expectPath(pathInput, ctx);
	await fs.rm(filePath);
	return { path: pathInput, realPath: filePath, deleted: true };
}

/**
 * Reject when `to` already exists on disk. `pageRename` / `pageCopy` never
 * clobber an existing destination — an agent that wants to overwrite must
 * `page_delete` first, making the intent explicit in a separate call.
 * @param to
 * @param toInput
 */
async function ensureDestinationAbsent(to: string, toInput: string): Promise<void> {
	const exists = await fs
		.access(to)
		.then(() => true)
		.catch(() => false);
	if (exists) {
		throw new PageAlreadyExistsError(toInput);
	}
}

/**
 * Rename `from` to `to` without clobbering an existing `to`, atomically when
 * possible. `fs.link` creates `to` only if it doesn't already exist (EEXIST
 * otherwise) — the same no-clobber guarantee `pageCopy` gets from
 * `COPYFILE_EXCL` — then `from` is removed to complete the rename. A plain
 * `fs.access` check followed by `fs.rename` (the original approach) leaves a
 * check-then-act race window where two concurrent renames to the same `to` can both pass
 * the check and one silently overwrites the other. Cross-device moves
 * (EXDEV — a hard link can't span filesystems any more than a rename can)
 * fall back to check-then-rename, the same residual race `fs.rename` alone
 * would have had, but only reachable when `from`/`to` live on different
 * filesystems.
 * @param from
 * @param to
 * @param toInput
 */
async function renameNoClobber(from: string, to: string, toInput: string): Promise<void> {
	try {
		await fs.link(from, to);
	} catch (error) {
		if (error instanceof Error && 'code' in error && error.code === 'EEXIST') {
			throw new PageAlreadyExistsError(toInput);
		}
		if (error instanceof Error && 'code' in error && error.code === 'EXDEV') {
			await ensureDestinationAbsent(to, toInput);
			await fs.rename(from, to);
			return;
		}
		throw error;
	}
	await fs.unlink(from);
}

/**
 *
 * @param ctx
 * @param fromInput
 * @param toInput
 */
export async function pageRename(ctx: CliContext, fromInput: string, toInput: string) {
	const from = expectPath(fromInput, ctx);
	const to = expectPath(toInput, ctx);
	const targetDir = path.dirname(to);
	// Remember which directories we created so a failed rename can clean up
	// instead of leaving orphan empty dirs under documentRoot (e.g. when
	// rename fails with EXDEV on a cross-device move).
	const createdDirs = await mkdirpReportCreated(targetDir);
	try {
		await renameNoClobber(from, to, toInput);
	} catch (error) {
		// Undo dir creation in reverse order; stop at the first non-empty dir.
		// Only swallow the two expected outcomes — ENOTEMPTY (sibling content
		// exists, leave it) and ENOENT (already gone). Anything else is a
		// surprise we don't want to mask.
		for (const dir of createdDirs.toReversed()) {
			await fs.rmdir(dir).catch((error_: unknown) => {
				if (
					error_ instanceof Error &&
					'code' in error_ &&
					(error_.code === 'ENOTEMPTY' || error_.code === 'ENOENT')
				) {
					return;
				}
				throw error_;
			});
		}
		throw error;
	}
	return { from: fromInput, to: toInput, renamed: true };
}

/**
 * Walk up the path creating each missing directory and report what we
 * actually created (innermost first), so a follow-up failure can roll the
 * creation back.
 * @param target directory to ensure exists
 */
async function mkdirpReportCreated(target: string): Promise<string[]> {
	const segments: string[] = [];
	let cursor = target;
	while (cursor && cursor !== path.dirname(cursor)) {
		// Only ENOENT indicates "directory does not exist yet, will create".
		// Anything else (EACCES, EIO, …) is a surprise — surface it so the
		// caller doesn't silently fall into a follow-up mkdir that fails for
		// the same reason and discards the diagnostic.
		const exists = await fs
			.stat(cursor)
			.then(() => true)
			.catch((error: unknown) => {
				if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
					return false;
				}
				throw error;
			});
		if (exists) break;
		segments.push(cursor);
		cursor = path.dirname(cursor);
	}
	// `segments` is innermost-first; create outermost-first so each mkdir's
	// parent already exists.
	for (const dir of segments.toReversed()) {
		await fs.mkdir(dir);
	}
	return segments;
}

/**
 *
 * @param ctx
 * @param fromInput
 * @param toInput
 */
export async function pageCopy(ctx: CliContext, fromInput: string, toInput: string) {
	const from = expectPath(fromInput, ctx);
	const to = expectPath(toInput, ctx);
	await fs.mkdir(path.dirname(to), { recursive: true });
	// COPYFILE_EXCL makes the exists-check atomic (unlike rename, copyFile
	// has a flag for it) — no separate fs.access race window.
	try {
		await fs.copyFile(from, to, fsConstants.COPYFILE_EXCL);
	} catch (error: unknown) {
		if (error instanceof Error && 'code' in error && error.code === 'EEXIST') {
			throw new PageAlreadyExistsError(toInput);
		}
		throw error;
	}
	return { from: fromInput, to: toInput, copied: true };
}

/**
 * Append the editable content of each source page onto the target page. The
 * target is created from the project template when it does not exist yet
 * (via `loadContent`'s existing auto-create behaviour), matching `page_concat`'s
 * "create-if-absent" contract for `to`. Front Matter of sources is dropped.
 * @param ctx
 * @param targetInput
 * @param sourceInputs
 */
export async function pageConcat(
	ctx: CliContext,
	targetInput: string,
	sourceInputs: readonly string[],
) {
	if (sourceInputs.length === 0) {
		throw new Error(
			'pageConcat requires at least one source — refusing a no-op so the CLI matches the MCP page_concat schema (sources.min(1)).',
		);
	}
	const target = expectPath(targetInput, ctx);
	// Use the project's real template (not '') so a `to` that doesn't exist
	// yet is created with an actual editable area — an empty string has none,
	// which turned "create to on demand" into a guaranteed NoEditableAreaError.
	const targetResult = await loadContent(
		target,
		ctx.config.editableArea,
		ctx.config.newFileContent,
	);
	if (targetResult instanceof NoEditableAreaError) {
		throw targetResult;
	}
	const pieces: string[] = [targetResult.editableContent];
	for (const sourceInput of sourceInputs) {
		const source = expectPath(sourceInput, ctx);
		// loadContent silently CREATES a missing file using newFileContent —
		// that's the right behaviour for target (page-create-ish), but for a
		// source it would mask a typoed path. Pre-check existence so a
		// missing source surfaces as an ENOENT instead of a stealth file
		// creation under documentRoot.
		await fs.access(source).catch((error: unknown) => {
			if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
				throw new Error(`pageConcat source does not exist: ${sourceInput}`);
			}
			throw error;
		});
		const sourceResult = await loadContent(source, ctx.config.editableArea, '');
		if (sourceResult instanceof NoEditableAreaError) {
			throw sourceResult;
		}
		pieces.push(sourceResult.editableContent);
	}
	await saveContent(
		target,
		pieces.filter((p) => p.trim().length > 0).join('\n'),
		ctx.config.editableArea,
		targetResult.frontMatter,
		targetResult.originalFrontMatter,
	);
	return { target: targetInput, sources: sourceInputs, concatenated: true };
}

// --------------------------------------------------- front matter ----------

/**
 *
 * @param ctx
 * @param pathInput
 */
export async function frontMatterGet(ctx: CliContext, pathInput: string) {
	const result = await pageGet(ctx, pathInput);
	return { path: pathInput, frontMatter: result.frontMatter };
}

/**
 *
 * @param ctx
 * @param pathInput
 * @param patch
 * @param merge
 */
export async function frontMatterSet(
	ctx: CliContext,
	pathInput: string,
	patch: Record<string, unknown>,
	merge: boolean,
) {
	// `Record<string, unknown>` at the type level admits arrays at runtime
	// (`typeof [] === 'object'`). The CLI's bin.ts catches this for cmdline
	// users, but MCP (`front_matter_set` tool) and any programmatic caller
	// would otherwise smuggle numeric-index keys into Front Matter and
	// silently corrupt the file. Defend at the handler too.
	if (Array.isArray(patch)) {
		throw new TypeError(
			'frontMatterSet patch must be a JSON object, not an array — numeric-index keys would corrupt Front Matter.',
		);
	}
	const filePath = expectPath(pathInput, ctx);
	const raw = await fs.readFile(filePath, 'utf8');
	const parsed = parseFrontMatter(raw);
	const next = merge ? { ...parsed.data, ...patch } : patch;
	const final = stringifyWithFrontMatter(
		parsed.content,
		next,
		parsed.originalFrontMatter,
	);
	await fs.writeFile(filePath, final, 'utf8');
	return { path: pathInput, frontMatter: next };
}

// ---------------------------------------------------------------- blocks ----

/**
 * A block target as used by every block-scoped tool: either the block's
 * position in the page (`index`, unstable across insert/delete) or its
 * stable `id` (see `blockEnsureId` for blocks that don't have one yet).
 */
export interface BlockTarget {
	readonly index?: number;
	readonly id?: string;
}

/**
 *
 * @param ctx
 * @param pathInput
 */
async function readEditable(ctx: CliContext, pathInput: string) {
	const filePath = expectPath(pathInput, ctx);
	const result = await loadContent(filePath, ctx.config.editableArea, '');
	if (result instanceof NoEditableAreaError) {
		throw result;
	}
	return { filePath, result };
}

/**
 * Read a page's editable area and parse it into blocks, or throw.
 * @param ctx
 * @param pathInput
 */
export async function readBlocks(
	ctx: CliContext,
	pathInput: string,
): Promise<readonly ListedBlock[]> {
	const { result } = await readEditable(ctx, pathInput);
	const blocks = listBlocks(result.editableContent, null);
	if (blocks instanceof NoEditableAreaError) {
		throw blocks;
	}
	return blocks;
}

/**
 * Resolve a `{ index } | { id }` block target against an already-parsed
 * block list. `id` wins when both are supplied.
 * @param blocks
 * @param target
 * @param pathInput
 */
export function resolveIndexInBlocks(
	blocks: readonly ListedBlock[],
	target: BlockTarget,
	pathInput: string,
): number {
	if (target.id !== undefined) {
		const found = blocks.find((b) => toFullBlockId(b.data.id) === target.id);
		if (!found) {
			throw new RangeError(`No block with id "${target.id}" found in ${pathInput}`);
		}
		return found.index;
	}
	if (target.index !== undefined) {
		// Bounds-check here so every caller (blockGet, blockReplace,
		// blockDelete, blockMove's `target`, blockDuplicate, blockEnsureId,
		// itemUpdate) gets a clear RangeError for an out-of-range index
		// instead of `blocks[index]` silently yielding `undefined` past a
		// `!`-asserted access further down the call stack. `Number.isInteger`
		// first: the CLI passes `Number(argv)`, so a missing or non-numeric
		// argument arrives as NaN, which slips through both `<`/`>=`
		// comparisons and would otherwise produce a "successful" result with
		// `block: undefined`.
		if (
			!Number.isInteger(target.index) ||
			target.index < 0 ||
			target.index >= blocks.length
		) {
			throw new RangeError(
				`Block index ${target.index} out of range (length=${blocks.length}) in ${pathInput}`,
			);
		}
		return target.index;
	}
	throw new TypeError('Block target must specify either "index" or "id".');
}

/**
 * The full DOM id a block would carry in the browser
 * (`BurgerEditorEngine.BLOCK_ID_PREFIX` + the block's own id suffix).
 * `BlockData.id` (as parsed by `parseHTMLToBlockData`) has that prefix
 * already stripped — see `core/src/block/export-options.ts` — so every
 * place that hands an id to, or receives one from, an agent (`target.id`,
 * `block_ensure_id`'s result, `page_blocks`' summaries) must go through
 * this conversion rather than use `BlockData.id` raw, or ids silently lose
 * their `bge-` prefix on the way out and stop round-tripping.
 * @param dataId
 */
export function toFullBlockId(dataId: string | null | undefined): string | null {
	return dataId ? `${BurgerEditorEngine.BLOCK_ID_PREFIX}${dataId}` : null;
}

/**
 *
 * @param ctx
 * @param pathInput
 * @param target
 */
export async function blockGet(ctx: CliContext, pathInput: string, target: BlockTarget) {
	const blocks = await readBlocks(ctx, pathInput);
	const index = resolveIndexInBlocks(blocks, target, pathInput);
	const block = blocks[index]!;
	return { path: pathInput, block };
}

/**
 *
 * @param ctx
 * @param pathInput
 * @param transform
 */
export interface MutationOptions {
	/**
	 * When `true`, compute the new editable-area HTML but do NOT write to
	 * disk. The would-be content is returned to the caller via the handler's
	 * result object (under `previewContent`) so CI / reviewer flows can
	 * diff before committing.
	 */
	readonly dryRun?: boolean;
}

interface WriteEditableResult {
	readonly filePath: string;
	/** The HTML that would be (or was) written into the editable area. */
	readonly previewContent: string;
	readonly dryRun: boolean;
}

/**
 *
 * @param ctx
 * @param pathInput
 * @param transform
 * @param options
 */
async function writeEditable(
	ctx: CliContext,
	pathInput: string,
	transform: (html: string) => string | NoEditableAreaError,
	options: MutationOptions = {},
): Promise<WriteEditableResult> {
	const filePath = expectPath(pathInput, ctx);
	// dryRun must not have side effects. loadContent creates the file when it
	// doesn't exist (intentional for the real write path — page_create relies
	// on it). Refuse before loadContent so a preview never leaves an empty
	// file behind on disk.
	if (options.dryRun) {
		const exists = await fs
			.access(filePath)
			.then(() => true)
			.catch(() => false);
		if (!exists) {
			throw new Error(
				`Cannot dry-run mutation on a non-existent page: ${pathInput} (resolved to ${filePath}). Create the page first or omit --dry-run.`,
			);
		}
	}
	const result = await loadContent(filePath, ctx.config.editableArea, '');
	if (result instanceof NoEditableAreaError) {
		throw result;
	}
	const next = transform(result.editableContent);
	if (next instanceof NoEditableAreaError) {
		throw next;
	}
	if (options.dryRun) {
		return { filePath, previewContent: next, dryRun: true };
	}
	await saveContent(
		filePath,
		next,
		ctx.config.editableArea,
		result.frontMatter,
		result.originalFrontMatter,
	);
	return { filePath, previewContent: next, dryRun: false };
}

/**
 *
 * @param ctx
 * @param pathInput
 * @param atIndex
 * @param spec
 * @param options
 */
export async function blockInsert(
	ctx: CliContext,
	pathInput: string,
	atIndex: number,
	spec: BlockSpec,
	options: MutationOptions = {},
) {
	const blockHtml = await renderBlockHtml(spec, ctx.config);
	const write = await writeEditable(
		ctx,
		pathInput,
		(html) => insertBlock(html, null, atIndex, blockHtml),
		options,
	);
	return {
		path: pathInput,
		atIndex,
		dryRun: write.dryRun,
		...(write.dryRun && { previewContent: write.previewContent }),
	};
}

/**
 *
 * @param ctx
 * @param pathInput
 * @param target
 * @param spec
 * @param options
 */
export async function blockReplace(
	ctx: CliContext,
	pathInput: string,
	target: BlockTarget,
	spec: BlockSpec,
	options: MutationOptions = {},
) {
	const blockHtml = await renderBlockHtml(spec, ctx.config);
	const write = await writeEditable(
		ctx,
		pathInput,
		(html) => {
			const blocks = listBlocks(html, null);
			if (blocks instanceof NoEditableAreaError) return blocks;
			const index = resolveIndexInBlocks(blocks, target, pathInput);
			return replaceBlock(html, null, index, blockHtml);
		},
		options,
	);
	return {
		path: pathInput,
		target,
		dryRun: write.dryRun,
		...(write.dryRun && { previewContent: write.previewContent }),
	};
}

/**
 *
 * @param ctx
 * @param pathInput
 * @param target
 * @param options
 */
export async function blockDelete(
	ctx: CliContext,
	pathInput: string,
	target: BlockTarget,
	options: MutationOptions = {},
) {
	const write = await writeEditable(
		ctx,
		pathInput,
		(html) => {
			const blocks = listBlocks(html, null);
			if (blocks instanceof NoEditableAreaError) return blocks;
			const index = resolveIndexInBlocks(blocks, target, pathInput);
			return deleteBlock(html, null, index);
		},
		options,
	);
	// No `deleted: bool` field — the operation was always "delete by index";
	// success is implicit from a non-throwing return. The earlier shape
	// `deleted: !dryRun` lied (it read 'the delete failed' when actually the
	// dry-run preview succeeded).
	return {
		path: pathInput,
		target,
		dryRun: write.dryRun,
		...(write.dryRun && { previewContent: write.previewContent }),
	};
}

/**
 *
 * @param ctx
 * @param pathInput
 * @param target
 * @param to
 * @param options
 */
export async function blockMove(
	ctx: CliContext,
	pathInput: string,
	target: BlockTarget,
	to: number,
	options: MutationOptions = {},
) {
	const write = await writeEditable(
		ctx,
		pathInput,
		(html) => {
			const blocks = listBlocks(html, null);
			if (blocks instanceof NoEditableAreaError) return blocks;
			const from = resolveIndexInBlocks(blocks, target, pathInput);
			// `to` is the destination in the FINAL list (splice convention) —
			// see block-ops.ts moveBlock for the pinned example.
			return moveBlock(html, null, from, to);
		},
		options,
	);
	// No `moved: bool` — see the note on blockDelete. Non-throwing return is
	// success; dryRun carries the rest.
	return {
		path: pathInput,
		target,
		to,
		dryRun: write.dryRun,
		...(write.dryRun && { previewContent: write.previewContent }),
	};
}

/**
 *
 * @param ctx
 * @param pathInput
 * @param target
 * @param options
 */
export async function blockDuplicate(
	ctx: CliContext,
	pathInput: string,
	target: BlockTarget,
	options: MutationOptions = {},
) {
	const write = await writeEditable(
		ctx,
		pathInput,
		(html) => {
			const blocks = listBlocks(html, null);
			if (blocks instanceof NoEditableAreaError) return blocks;
			const index = resolveIndexInBlocks(blocks, target, pathInput);
			// duplicateBlock (core) already strips id from the clone, so the
			// duplicate never collides with the original's id.
			return duplicateBlock(html, null, index);
		},
		options,
	);
	return {
		path: pathInput,
		target,
		dryRun: write.dryRun,
		...(write.dryRun && { previewContent: write.previewContent }),
	};
}

/**
 * Pick the lowest-numbered `bge-<n>` id not already used by any block on the
 * page, matching the browser engine's own id vocabulary
 * (`BurgerEditorEngine.BLOCK_ID_PREFIX`).
 * @param blocks
 */
function generateBlockId(blocks: readonly ListedBlock[]): string {
	// `BlockData.id` already has the `bge-` prefix stripped (see
	// `toFullBlockId`'s JSDoc) — compare against the bare suffix, not a
	// re-prefixed one, or this loop never finds a collision and always
	// returns `bge-1`.
	const used = new Set(blocks.map((b) => b.data.id).filter(Boolean));
	let n = 1;
	while (used.has(String(n))) {
		n++;
	}
	return `${BurgerEditorEngine.BLOCK_ID_PREFIX}${n}`;
}

/**
 * Set the `id` attribute on a block's root element, returning the updated
 * outerHTML.
 * @param blockHtml
 * @param id
 */
function setRootElementId(blockHtml: string, id: string): string {
	const doc = new DOMParser().parseFromString(
		`<html><body>${blockHtml}</body></html>`,
		'text/html',
	);
	const el = doc.body.firstElementChild as HTMLElement | null;
	if (!el) {
		throw new Error('Block HTML has no root element.');
	}
	el.id = id;
	return el.outerHTML;
}

/**
 * Assign a stable `bge-<n>` id to a block that doesn't have one yet.
 * Idempotent: calling it again on a block that already has an id returns
 * that id unchanged instead of reassigning.
 *
 * Target resolution AND the id-bearing HTML are both computed from the same
 * fresh `html` `writeEditable` loads at write time — not from an earlier
 * `readBlocks()` snapshot. Building `withId` off a separate, older read
 * would let a change to the page between that read and the write get
 * silently discarded: the write would replace the (now stale) target index
 * with the old snapshot's content, plus the new id, clobbering whatever
 * changed it in between.
 * @param ctx
 * @param pathInput
 * @param target
 */
export async function blockEnsureId(
	ctx: CliContext,
	pathInput: string,
	target: BlockTarget,
) {
	let outcome!: { index: number; id: string; created: boolean };
	await writeEditable(ctx, pathInput, (html) => {
		const blocks = listBlocks(html, null);
		if (blocks instanceof NoEditableAreaError) return blocks;
		const index = resolveIndexInBlocks(blocks, target, pathInput);
		const block = blocks[index]!;
		const existingId = toFullBlockId(block.data.id);
		if (existingId) {
			outcome = { index, id: existingId, created: false };
			return html;
		}
		const id = generateBlockId(blocks);
		const withId = setRootElementId(block.html, id);
		outcome = { index, id, created: true };
		return replaceBlock(html, null, index, withId);
	});
	return { path: pathInput, ...outcome };
}

/**
 * Collect a block's item wrapper elements (`[data-bgi]`) in DOM order —
 * `[data-bge-group]` then `[data-bge-item]` — matching the flat `itemIndex`
 * convention used by `page_blocks` / `item_update`. One entry per
 * `[data-bge-item]`, including a `null` for an item with no `[data-bgi]`
 * wrapper — NOT filtered down to only wrapped items. Filtering here would
 * knock this function's `itemIndex` out of sync with the item count
 * `parseHTMLToBlockData` (core's `parse-html-to-definition.ts`) reports for
 * the same block — the same count `page_blocks`/`block_get` expose as
 * `itemNames` — so an agent addressing item N by that index would silently
 * hit item N+1 (or later) here once any earlier item lacked a wrapper.
 * @param blockEl
 */
export function getItemWrapperElements(
	blockEl: HTMLElement,
): ReadonlyArray<HTMLElement | null> {
	const groups = [...blockEl.querySelectorAll<HTMLElement>('[data-bge-group]')];
	const itemEls = groups.flatMap((g) => [
		...g.querySelectorAll<HTMLElement>('[data-bge-item]'),
	]);
	return itemEls.map((itemEl) => itemEl.querySelector<HTMLElement>('[data-bgi]'));
}

/**
 * Update one item's data within a block — the disk-side equivalent of the
 * browser's `Item.import(data)`: current data is read back from the item's
 * template HTML, shallow-merged with `data`, and re-rendered.
 * @param ctx
 * @param pathInput
 * @param target
 * @param itemIndex
 * @param data
 * @param options
 */
export async function itemUpdate(
	ctx: CliContext,
	pathInput: string,
	target: BlockTarget,
	itemIndex: number,
	// Arbitrary JSON from an agent call — not narrowed to ItemPrimitiveData at
	// this boundary. Merged with the item's real current data (parsed from its
	// own template) below, which is what actually gets rendered.
	data: Record<string, unknown>,
	options: MutationOptions = {},
) {
	const write = await writeEditable(
		ctx,
		pathInput,
		(html) => {
			const blocks = listBlocks(html, null);
			if (blocks instanceof NoEditableAreaError) return blocks;
			const index = resolveIndexInBlocks(blocks, target, pathInput);
			const block = blocks[index]!;
			const doc = new DOMParser().parseFromString(
				`<html><body>${block.html}</body></html>`,
				'text/html',
			);
			const blockEl = doc.body.firstElementChild as HTMLElement;
			const wrappers = getItemWrapperElements(blockEl);
			if (itemIndex < 0 || itemIndex >= wrappers.length) {
				throw new RangeError(
					`Item index ${itemIndex} out of range (length=${wrappers.length})`,
				);
			}
			const wrapper = wrappers[itemIndex];
			if (!wrapper) {
				// In range, but this particular item has no [data-bgi] wrapper
				// (a defensive fallback core renders as name:'wysiwyg' when
				// reading — see parse-html-to-definition.ts). There's no
				// template HTML here to merge item_update's `data` into.
				throw new Error(
					`Item ${itemIndex} in this block has no data-bgi wrapper and cannot be updated via item_update.`,
				);
			}
			const currentData = itemExport(wrapper.innerHTML);
			const merged: ItemData = { ...currentData, ...data } as ItemData;
			wrapper.innerHTML = itemImport(wrapper.innerHTML, merged);
			return replaceBlock(html, null, index, blockEl.outerHTML);
		},
		options,
	);
	return {
		path: pathInput,
		target,
		itemIndex,
		dryRun: write.dryRun,
		...(write.dryRun && { previewContent: write.previewContent }),
	};
}

// ------------------------------------------------ catalog / item ----

/**
 *
 * @param ctx
 */
export function catalogList(ctx: CliContext) {
	const entries: Array<{ category: string; label: string; name: string }> = [];
	for (const category of Object.keys(ctx.config.catalog)) {
		for (const item of ctx.config.catalog[category] ?? []) {
			entries.push({
				category,
				label: item.label,
				name: item.definition.name,
			});
		}
	}
	return { catalogs: entries };
}

/**
 *
 * @param ctx
 * @param name
 */
export function catalogGet(ctx: CliContext, name: string) {
	for (const category of Object.keys(ctx.config.catalog)) {
		for (const item of ctx.config.catalog[category] ?? []) {
			if (item.definition.name === name) {
				// Build a ready-to-insert spec template alongside the raw
				// definition. The raw `definition.items` only carries item
				// NAMES (e.g. [["title-h2"]]); agents previously had to know
				// to wrap each entry as `{name, data}` with the right
				// camelCased data keys. The template does that expansion for
				// them so `block-insert --spec '<template>'` works as-is.
				return {
					category,
					label: item.label,
					definition: item.definition,
					template: buildBlockSpecTemplate(item.definition),
				};
			}
		}
	}
	throw new Error(`Unknown catalog block name: "${name}"`);
}

/**
 *
 */
export function itemList() {
	return { items: Object.keys(defaultItems) };
}

/**
 *
 * @param itemName
 */
export function itemSchema(itemName: string) {
	const item = (defaultItems as Record<string, unknown>)[itemName];
	if (!item) {
		throw new Error(`Unknown item: "${itemName}"`);
	}
	const seed = item as {
		name: string;
		template?: string;
		exportData?: (el: HTMLElement) => ItemData;
	};
	// The data-bge bindings in the template define the item data keys.
	// Surface them (camelCased, as they appear in the JSON data) so the
	// agent can infer required keys without the removed editor HTML.
	const fields = new Set<string>();
	for (const match of (seed.template ?? '').matchAll(/data-bge="([^"]*)"/g)) {
		const binding = match[1];
		if (!binding) {
			continue;
		}
		// 不正・空のバインディングでスキーマ取得全体を落とさない
		let parsed;
		try {
			parsed = parseFields(binding);
		} catch {
			continue;
		}
		for (const field of parsed) {
			if (field.fieldName) {
				fields.add(field.fieldName);
			}
		}
	}
	// `dataKeys` is the camelCased key set the runtime data record uses —
	// derived from the item's *template* via frozen-patty (itemExport). The
	// template's `data-bge=*` attributes are the source of truth at render
	// time. `fields` (parseFields on each binding) and `dataKeys`
	// (itemExport over the whole template) answer the same question through
	// two independent parsers; both are part of the published contract.
	return {
		name: seed.name,
		template: seed.template,
		fields: [...fields],
		dataKeys: extractDataKeys(seed.template),
	};
}

/**
 * Derive the camelCase data-key set an item uses at render time by parsing
 * its *template* via the project's own `itemExport` (frozen-patty). That is
 * the actual contract — the runtime read/write goes through `data-bge=*`
 * attributes on the template, NOT through the editor form's `name=`
 * attributes. The two are conventionally aligned for simple items (e.g.
 * `title-h2`), but diverge for items whose editor uses custom elements
 * (`<bge-wysiwyg-editor>`), array-suffix names (`bge-path[]`), or computed
 * fields that never appear in the rendered template.
 * @param template item template HTML (may be undefined for items that
 * have only an editor, like rare meta-items)
 */
function extractDataKeys(template: string | undefined): string[] {
	if (!template) return [];
	return Object.keys(itemExport(template));
}

/**
 * Expand a catalog `BlockDefinition` into a ready-to-render `BlockSpec` —
 * fills containerProps, replaces item name strings with `{name, data}`
 * objects whose `data` is populated with all known camelCase keys set to
 * empty strings.
 * @param definition
 * @param definition.name
 * @param definition.containerProps
 * @param definition.classList
 * @param definition.style
 * @param definition.items
 */
function buildBlockSpecTemplate(definition: {
	readonly name: string;
	readonly containerProps: Record<string, unknown>;
	readonly classList?: readonly string[];
	readonly style?: Record<string, string>;
	readonly items: ReadonlyArray<ReadonlyArray<unknown>>;
}): {
	readonly catalog: string;
	readonly containerProps: Record<string, unknown>;
	readonly classList?: readonly string[];
	readonly style?: Record<string, string>;
	readonly items: unknown[][];
} {
	const expandedItems: unknown[][] = definition.items.map((group) =>
		group.map((slot) => {
			const itemName = typeof slot === 'string' ? slot : (slot as { name: string }).name;
			const existingData =
				typeof slot === 'string'
					? {}
					: ((slot as { data?: Record<string, unknown> }).data ?? {});
			const seed = (defaultItems as Record<string, unknown>)[itemName];
			const template = (seed as { template?: string } | undefined)?.template;
			const dataKeys = extractDataKeys(template);
			const data: Record<string, unknown> = { ...existingData };
			for (const key of dataKeys) {
				if (!(key in data)) data[key] = '';
			}
			return { name: itemName, data };
		}),
	);
	return {
		catalog: definition.name,
		containerProps: { ...definition.containerProps },
		...(definition.classList && { classList: definition.classList }),
		...(definition.style && { style: definition.style }),
		items: expandedItems,
	};
}

// ----------------------------------------------- style / container options

/**
 *
 * @param ctx
 */
export async function styleOptionsList(ctx: CliContext) {
	// Read every stylesheet referenced in config + project CSS files in
	// assetsRoot, parse out `--bge-options-<axis>--<variant>` custom
	// properties, and return them grouped by axis.
	const collected = new Map<string, Set<string>>();
	const stylesheetUrls = ctx.config.stylesheets ?? [];
	// Stylesheet reads are independent — fan out so 8 sheets cost the
	// slowest read, not the sum.
	const cssContents = await Promise.all(
		stylesheetUrls.map((url) => {
			const filePath = path.join(ctx.config.assetsRoot, url.replace(/^\//, ''));
			return fs.readFile(filePath, 'utf8').catch(() => null);
		}),
	);
	for (const css of cssContents) {
		if (css === null) continue; // non-fatal: stylesheet may be served from elsewhere
		extractBgeOptions(css, collected);
	}
	const result: Record<string, string[]> = {};
	for (const [axis, variants] of collected) {
		result[axis] = [...variants].toSorted();
	}
	return { axes: result };
}

/**
 *
 * @param css
 * @param into
 */
function extractBgeOptions(css: string, into: Map<string, Set<string>>): void {
	// Axis and variant are each a sequence of word groups joined by single
	// hyphens; the `--` between them is the unambiguous separator. Writing
	// both halves as `(?:\w+-)*\w+` eliminates the lazy-quantifier
	// backtracking that triggers regexp/no-super-linear-backtracking.
	const re = /--bge-options-((?:\w+-)*\w+)--((?:\w+-)*\w+)\s*:/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(css)) !== null) {
		const axis = m[1]!;
		const variant = m[2]!;
		const set = into.get(axis) ?? new Set<string>();
		set.add(variant);
		into.set(axis, set);
	}
}

/**
 *
 */
export function containerOptionsList() {
	return {
		types: ['grid', 'inline', 'float'],
		gridOptions: {
			columns: [1, 2, 3, 4, 5],
			autoRepeat: ['auto-fit', 'auto-fill'],
			repeatMinInlineSizeVariants: ['--small', '--medium', '--large'],
		},
		inlineOptions: {
			justify: ['center', 'start', 'end', 'between', 'around', 'evenly'],
			align: [
				'align-center',
				'align-start',
				'align-end',
				'align-stretch',
				'align-baseline',
			],
			wrap: ['wrap', 'no-wrap'],
		},
		floatOptions: ['start', 'end'],
	};
}

// ---------------------------------------------------------------- config ----

/**
 *
 * @param ctx
 */
export function configResolve(ctx: CliContext) {
	return {
		configPath: ctx.configPath,
		documentRoot: ctx.config.documentRoot,
		assetsRoot: ctx.config.assetsRoot,
		editableArea: ctx.config.editableArea,
		indexFileName: ctx.config.indexFileName,
		virtualTree: ctx.config.virtualTree,
		newFileContent: ctx.config.newFileContent,
	};
}
