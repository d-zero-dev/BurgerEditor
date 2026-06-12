import { describe, expect, test } from 'vitest';

import { NoEditableAreaError } from '../document/no-editable-area-error.js';

import {
	deleteBlock,
	duplicateBlock,
	getBlock,
	insertBlock,
	listBlocks,
	moveBlock,
	replaceBlock,
} from './block-ops.js';

const SAMPLE_HTML = `
<main class="content">
	<div data-bge-name="a" data-bge-container="grid:1">
		<div data-bge-container-frame>
			<div data-bge-group>
				<div data-bge-item><div data-bgi="wysiwyg"><p>A</p></div></div>
			</div>
		</div>
	</div>
	<div data-bge-name="b" data-bge-container="grid:1">
		<div data-bge-container-frame>
			<div data-bge-group>
				<div data-bge-item><div data-bgi="wysiwyg"><p>B</p></div></div>
			</div>
		</div>
	</div>
</main>
`;

const NEW_BLOCK_HTML = `<div data-bge-name="c" data-bge-container="grid:1"><div data-bge-container-frame><div data-bge-group><div data-bge-item><div data-bgi="wysiwyg"><p>C</p></div></div></div></div></div>`;

describe('block-ops', () => {
	test('listBlocks returns blocks with index and data', () => {
		const result = listBlocks(SAMPLE_HTML, '.content');
		expect(result).not.toBeInstanceOf(NoEditableAreaError);
		const blocks = result as Exclude<typeof result, NoEditableAreaError>;
		expect(blocks).toHaveLength(2);
		expect(blocks[0]!.index).toBe(0);
		expect(blocks[0]!.data.name).toBe('a');
		expect(blocks[1]!.data.name).toBe('b');
	});

	test('listBlocks returns NoEditableAreaError when selector misses', () => {
		const result = listBlocks(SAMPLE_HTML, '.missing');
		expect(result).toBeInstanceOf(NoEditableAreaError);
	});

	test('listBlocks NoEditableAreaError carries candidate selectors (recovery hint for typoed editableArea)', () => {
		// Regression: block-ops used to call `new NoEditableAreaError(selector)`
		// without candidates, so the "did you mean?" hint that file-io
		// surfaces was absent here. Now wired through collectCandidateSelectors.
		const html = `<header id="site-header"></header><main class="content"></main><aside class="sidebar"></aside>`;
		const result = listBlocks(html, '.contnet');
		expect(result).toBeInstanceOf(NoEditableAreaError);
		const candidates = (result as NoEditableAreaError).candidates;
		expect(candidates).toEqual(
			expect.arrayContaining(['#site-header', '.content', '.sidebar']),
		);
	});

	test('insertBlock NoEditableAreaError carries candidates so agents can recover from a typo', () => {
		const html = `<main class="real"></main><nav class="menu"></nav>`;
		const result = insertBlock(html, '.typo', 0, NEW_BLOCK_HTML);
		expect(result).toBeInstanceOf(NoEditableAreaError);
		expect((result as NoEditableAreaError).candidates).toEqual(
			expect.arrayContaining(['.real', '.menu']),
		);
	});

	test('getBlock retrieves a specific block', () => {
		const result = getBlock(SAMPLE_HTML, '.content', 1);
		expect(result).not.toBeInstanceOf(NoEditableAreaError);
		expect((result as Exclude<typeof result, NoEditableAreaError>).data.name).toBe('b');
	});

	test('getBlock out of range throws RangeError', () => {
		expect(() => getBlock(SAMPLE_HTML, '.content', 99)).toThrow(RangeError);
	});

	test('insertBlock at start prepends', () => {
		const result = insertBlock(SAMPLE_HTML, '.content', 0, NEW_BLOCK_HTML);
		expect(typeof result).toBe('string');
		const listed = listBlocks(result as string, '.content') as Exclude<
			ReturnType<typeof listBlocks>,
			NoEditableAreaError
		>;
		expect(listed.map((b) => b.data.name)).toEqual(['c', 'a', 'b']);
	});

	test('insertBlock at end appends', () => {
		const result = insertBlock(SAMPLE_HTML, '.content', 99, NEW_BLOCK_HTML);
		const listed = listBlocks(result as string, '.content') as Exclude<
			ReturnType<typeof listBlocks>,
			NoEditableAreaError
		>;
		expect(listed.map((b) => b.data.name)).toEqual(['a', 'b', 'c']);
	});

	test('replaceBlock substitutes target', () => {
		const result = replaceBlock(SAMPLE_HTML, '.content', 0, NEW_BLOCK_HTML);
		const listed = listBlocks(result as string, '.content') as Exclude<
			ReturnType<typeof listBlocks>,
			NoEditableAreaError
		>;
		expect(listed.map((b) => b.data.name)).toEqual(['c', 'b']);
	});

	test('deleteBlock removes target', () => {
		const result = deleteBlock(SAMPLE_HTML, '.content', 0);
		const listed = listBlocks(result as string, '.content') as Exclude<
			ReturnType<typeof listBlocks>,
			NoEditableAreaError
		>;
		expect(listed.map((b) => b.data.name)).toEqual(['b']);
	});

	test('moveBlock reorders blocks', () => {
		const result = moveBlock(SAMPLE_HTML, '.content', 0, 1);
		const listed = listBlocks(result as string, '.content') as Exclude<
			ReturnType<typeof listBlocks>,
			NoEditableAreaError
		>;
		expect(listed.map((b) => b.data.name)).toEqual(['b', 'a']);
	});

	test('duplicateBlock inserts a clone after the target', () => {
		const result = duplicateBlock(SAMPLE_HTML, '.content', 0);
		const listed = listBlocks(result as string, '.content') as Exclude<
			ReturnType<typeof listBlocks>,
			NoEditableAreaError
		>;
		expect(listed.map((b) => b.data.name)).toEqual(['a', 'a', 'b']);
	});

	test('duplicateBlock strips id so the clone is not a duplicate-id element', () => {
		// Block A has id="hero"; duplicating it must NOT yield two #hero
		// elements in the same document (HTML validity + later block_replace
		// would otherwise resolve by id ambiguously).
		const htmlWithId = `
<main class="content">
	<div id="hero" data-bge-name="a" data-bge-container="grid:1">
		<div data-bge-container-frame><div data-bge-group><div data-bge-item><div data-bgi="wysiwyg"><p>A</p></div></div></div></div>
	</div>
</main>
`;
		const result = duplicateBlock(htmlWithId, '.content', 0) as string;
		const idMatches = result.match(/id="hero"/g) ?? [];
		expect(idMatches).toHaveLength(1);
	});

	test('duplicateBlock leaves a block with no id alone', () => {
		// Pin the no-op case: stripping id on a block that never had one
		// must not introduce any spurious attribute changes.
		const result = duplicateBlock(SAMPLE_HTML, '.content', 0) as string;
		expect(result).not.toContain('id=""');
	});

	test('moveBlock interprets toIndex as the destination in the FINAL list', () => {
		// Pin the splice-style semantics documented in update-page.md so
		// future refactors don't silently flip to "insert before original
		// index N".
		const fourBlocks = `<main class="content">
			<div data-bge-name="a" data-bge-container="grid:1"></div>
			<div data-bge-name="b" data-bge-container="grid:1"></div>
			<div data-bge-name="c" data-bge-container="grid:1"></div>
			<div data-bge-name="d" data-bge-container="grid:1"></div>
		</main>`;
		const result = moveBlock(fourBlocks, '.content', 0, 2) as string;
		const listed = listBlocks(result, '.content') as Exclude<
			ReturnType<typeof listBlocks>,
			NoEditableAreaError
		>;
		expect(listed.map((b) => b.data.name)).toEqual(['b', 'c', 'a', 'd']);
	});

	test('works with editableArea=null on fragment input', () => {
		const fragment = `<div data-bge-name="x" data-bge-container="grid:1"></div><div data-bge-name="y" data-bge-container="grid:1"></div>`;
		const result = listBlocks(fragment, null);
		const listed = result as Exclude<typeof result, NoEditableAreaError>;
		expect(listed.map((b) => b.data.name)).toEqual(['x', 'y']);
	});
});
