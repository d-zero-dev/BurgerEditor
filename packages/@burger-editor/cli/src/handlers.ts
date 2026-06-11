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
	return { tree, documentRoot: ctx.config.documentRoot };
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
	try {
		await fs.access(filePath);
		throw new Error(`Page already exists: ${filePath}`);
	} catch (error) {
		if (error instanceof Error && 'code' in error && error.code !== 'ENOENT') {
			throw error;
		}
	}
	const template = ctx.config.newFileContent || '';
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
	await fs.mkdir(path.dirname(to), { recursive: true });
	await fs.rename(from, to);
	return { from: fromInput, to: toInput, renamed: true };
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
	const target = expectPath(targetInput, ctx);
	const targetResult = await loadContent(target, ctx.config.editableArea, '');
	if (targetResult instanceof NoEditableAreaError) {
		throw targetResult;
	}
	const pieces: string[] = [targetResult.editableContent];
	for (const sourceInput of sourceInputs) {
		const source = expectPath(sourceInput, ctx);
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
async function writeEditable(
	ctx: CliContext,
	pathInput: string,
	transform: (html: string) => string | NoEditableAreaError,
) {
	const filePath = expectPath(pathInput, ctx);
	const result = await loadContent(filePath, ctx.config.editableArea, '');
	if (result instanceof NoEditableAreaError) {
		throw result;
	}
	const next = transform(result.editableContent);
	if (next instanceof NoEditableAreaError) {
		throw next;
	}
	await saveContent(
		filePath,
		next,
		ctx.config.editableArea,
		result.frontMatter,
		result.originalFrontMatter,
	);
	return filePath;
}

/**
 *
 * @param ctx
 * @param pathInput
 * @param atIndex
 * @param spec
 */
export async function blockInsert(
	ctx: CliContext,
	pathInput: string,
	atIndex: number,
	spec: BlockSpec,
) {
	const blockHtml = await renderBlockHtml(spec, ctx.config);
	await writeEditable(ctx, pathInput, (html) =>
		insertBlock(html, null, atIndex, blockHtml),
	);
	return { path: pathInput, atIndex };
}

/**
 *
 * @param ctx
 * @param pathInput
 * @param index
 * @param spec
 */
export async function blockReplace(
	ctx: CliContext,
	pathInput: string,
	index: number,
	spec: BlockSpec,
) {
	const blockHtml = await renderBlockHtml(spec, ctx.config);
	await writeEditable(ctx, pathInput, (html) =>
		replaceBlock(html, null, index, blockHtml),
	);
	return { path: pathInput, index };
}

/**
 *
 * @param ctx
 * @param pathInput
 * @param index
 */
export async function blockDelete(ctx: CliContext, pathInput: string, index: number) {
	await writeEditable(ctx, pathInput, (html) => deleteBlock(html, null, index));
	return { path: pathInput, index, deleted: true };
}

/**
 *
 * @param ctx
 * @param pathInput
 * @param from
 * @param to
 */
export async function blockMove(
	ctx: CliContext,
	pathInput: string,
	from: number,
	to: number,
) {
	await writeEditable(ctx, pathInput, (html) => moveBlock(html, null, from, to));
	return { path: pathInput, from, to, moved: true };
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
				return {
					category,
					label: item.label,
					definition: item.definition,
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
	// Editor HTML describes the input fields; their `name` attributes become
	// the keys of the item data. We surface the editor template verbatim so
	// the agent can read it and infer required keys.
	return {
		name: seed.name,
		template: seed.template,
		editor: seed.editor,
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
	for (const url of stylesheetUrls) {
		const filePath = path.join(ctx.config.assetsRoot, url.replace(/^\//, ''));
		try {
			const css = await fs.readFile(filePath, 'utf8');
			extractBgeOptions(css, collected);
		} catch {
			// non-fatal: stylesheet may be served from elsewhere
		}
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
