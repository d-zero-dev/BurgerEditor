export type * from './types.js';
export type * from './block/types.js';
export type * from './item/types.js';
export type * from './document/types.js';

export { BurgerBlock } from './block/block.js';
export { BurgerEditorEngine } from './engine/engine.js';
export { Item } from './item/item.js';
export { createItem } from './item/create-item.js';
export { ItemEditorDialog } from './item-editor-dialog.js';
export { dataToHtml as itemImport } from './item/data-to-html.js';
export { dataFromHtml as itemExport } from './item/data-from-html.js';
export { render } from './render.js';
export { ComponentObserver } from './component-observer.js';
export * from './const.js';
export * from './utils/find-value-pattern-from-array.js';
export { exportStyleOptions } from './block/export-style-options.js';
export { getBlockAtPosition } from './get-block-at-position.js';
export { parseHTMLToBlockData } from './block/parse-html-to-definition.js';

// Document helpers (Front Matter / editable area extraction)
export { NoEditableAreaError } from './document/no-editable-area-error.js';
export {
	parseFrontMatter,
	stringifyWithFrontMatter,
	isFrontMatterChanged,
} from './document/front-matter.js';
export {
	isFullHtmlDocument,
	extractContentFromHtml,
	updateHtmlContent,
} from './document/html-detection.js';

// Block-level operations on HTML strings
export type { ListedBlock } from './block/block-ops.js';
export {
	listBlocks,
	getBlock,
	insertBlock,
	replaceBlock,
	deleteBlock,
	moveBlock,
	duplicateBlock,
} from './block/block-ops.js';
