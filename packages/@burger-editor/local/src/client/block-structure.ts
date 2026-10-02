import { listBlocks, NoEditableAreaError } from '@burger-editor/core';

/**
 * Whether the editor's normalization on open changed the page's block list
 * (count or block names, in order) — what an agent's block index depends on.
 * A plain string comparison would flag nearly every page: the loaded HTML is
 * Prettier-formatted and untrimmed, while the editor's output is trimmed and
 * re-serialized, even when the blocks are identical.
 * @param loaded - The editable area's HTML as loaded from disk
 * @param normalized - The same area as the editor serialized it on open
 * @example
 * ```ts
 * hasBlockStructureChanged('<p>raw</p>', '<div data-bge-container="grid:1" data-bge-name="wysiwyg">…</div>'); // true
 * ```
 */
export function hasBlockStructureChanged(loaded: string, normalized: string): boolean {
	const before = blockNames(loaded);
	const after = blockNames(normalized);
	return before.length !== after.length || before.some((name, i) => name !== after[i]);
}

/**
 * @param html
 */
function blockNames(html: string): readonly string[] {
	const blocks = listBlocks(html, null);
	// Unreachable with `editableArea: null` (the scope is a wrapper this call
	// creates itself) — narrowed only for the return type.
	if (blocks instanceof NoEditableAreaError) {
		return [];
	}
	return blocks.map((block) => block.data.name);
}
