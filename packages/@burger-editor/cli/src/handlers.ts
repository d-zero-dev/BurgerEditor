import type { BlockSpec } from './block-builder.js';
import type { CliContext } from './context.js';
import type { ItemData } from '@burger-editor/core';

import fs from 'node:fs/promises';
import path from 'node:path';

import { items as defaultItems } from '@burger-editor/blocks';
import {
	NoEditableAreaError,
	deleteBlock,
	getBlock,
	insertBlock,
	itemExport,
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

import { renderBlockHtml } from './block-builder.js';

/**
 *
 * @param input
 * @param ctx
 */
function expectPath(input: string, ctx: CliContext): string {
	return resolvePathInput(input, ctx.config, ctx.resolverState);
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
			throw new Error(`Page already exists: ${filePath}`);
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
		await fs.rename(from, to);
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
	await fs.copyFile(from, to);
	return { from: fromInput, to: toInput, copied: true };
}

/**
 * Append the editable content of each source page onto the target page (which
 * must already exist). Front Matter of sources is dropped.
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
	const targetResult = await loadContent(target, ctx.config.editableArea, '');
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
 *
 * @param ctx
 * @param pathInput
 */
export async function blockList(ctx: CliContext, pathInput: string) {
	const { result } = await readEditable(ctx, pathInput);
	const blocks = listBlocks(result.editableContent, null);
	if (blocks instanceof NoEditableAreaError) {
		throw blocks;
	}
	return { path: pathInput, blocks };
}

/**
 *
 * @param ctx
 * @param pathInput
 * @param index
 */
export async function blockGet(ctx: CliContext, pathInput: string, index: number) {
	const { result } = await readEditable(ctx, pathInput);
	const block = getBlock(result.editableContent, null, index);
	if (block instanceof NoEditableAreaError) {
		throw block;
	}
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
 * @param index
 * @param spec
 * @param options
 */
export async function blockReplace(
	ctx: CliContext,
	pathInput: string,
	index: number,
	spec: BlockSpec,
	options: MutationOptions = {},
) {
	const blockHtml = await renderBlockHtml(spec, ctx.config);
	const write = await writeEditable(
		ctx,
		pathInput,
		(html) => replaceBlock(html, null, index, blockHtml),
		options,
	);
	return {
		path: pathInput,
		index,
		dryRun: write.dryRun,
		...(write.dryRun && { previewContent: write.previewContent }),
	};
}

/**
 *
 * @param ctx
 * @param pathInput
 * @param index
 * @param options
 */
export async function blockDelete(
	ctx: CliContext,
	pathInput: string,
	index: number,
	options: MutationOptions = {},
) {
	const write = await writeEditable(
		ctx,
		pathInput,
		(html) => deleteBlock(html, null, index),
		options,
	);
	// No `deleted: bool` field — the operation was always "delete by index";
	// success is implicit from a non-throwing return. The earlier shape
	// `deleted: !dryRun` lied (it read 'the delete failed' when actually the
	// dry-run preview succeeded).
	return {
		path: pathInput,
		index,
		dryRun: write.dryRun,
		...(write.dryRun && { previewContent: write.previewContent }),
	};
}

/**
 *
 * @param ctx
 * @param pathInput
 * @param from
 * @param to
 * @param options
 */
export async function blockMove(
	ctx: CliContext,
	pathInput: string,
	from: number,
	to: number,
	options: MutationOptions = {},
) {
	const write = await writeEditable(
		ctx,
		pathInput,
		(html) => moveBlock(html, null, from, to),
		options,
	);
	// No `moved: bool` — see the note on blockDelete. Non-throwing return is
	// success; dryRun carries the rest.
	return {
		path: pathInput,
		from,
		to,
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
				// to wrap each entry as `{name, data: {...}}` with the right
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
		editor?: string;
		exportData?: (el: HTMLElement) => ItemData;
	};
	// `dataKeys` is the camelCased key set the runtime data record uses —
	// derived from the item's *template* via frozen-patty (itemExport). The
	// template's `data-bge=*` attributes are the source of truth at render
	// time; the editor form's `name=` attributes happen to align for simple
	// items but DIVERGE for wysiwyg / image (`bge-path[]`) / details etc.
	return {
		name: seed.name,
		template: seed.template,
		editor: seed.editor,
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
