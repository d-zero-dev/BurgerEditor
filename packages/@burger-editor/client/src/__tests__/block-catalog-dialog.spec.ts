import { test, expect, beforeEach, describe, vi } from 'vitest';

import { BlockCatalogDialog } from '../../../core/src/block-catalog-dialog.js';

/**
 *
 */
function createDefaultSettings() {
	return {
		addBlock: vi.fn().mockResolvedValue(void 0),
		onClosed: vi.fn(),
		onOpen: vi.fn(),
		createEditorComponent: vi.fn(),
	};
}

const mockCatalog = {
	基本ブロック: [
		{
			label: 'テキスト',
			definition: {
				name: 'text-block',
				containerProps: {},
				items: [[{ name: 'text' }]],
			},
		},
		{
			label: '画像',
			definition: {
				name: 'image-block',
				containerProps: {},
				items: [[{ name: 'image' }]],
			},
		},
	],
	レイアウト: [
		{
			label: '2カラム',
			definition: {
				name: 'two-column',
				containerProps: {},
				items: [[{ name: 'text' }], [{ name: 'text' }]],
			},
		},
	],
};

describe('BlockCatalogDialog', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	describe('constructor', () => {
		test('should store catalog as a Map', () => {
			const settings = createDefaultSettings();
			const dialog = new BlockCatalogDialog(mockCatalog, settings);

			expect(dialog.catalog).toBeInstanceOf(Map);
			expect(dialog.catalog.size).toBe(2);
			expect(dialog.catalog.get('基本ブロック')).toHaveLength(2);
			expect(dialog.catalog.get('レイアウト')).toHaveLength(1);
		});

		test('should create dialog with close button only', () => {
			const settings = createDefaultSettings();
			new BlockCatalogDialog(mockCatalog, settings);

			const dialog = document.body.querySelector('dialog')!;
			const buttons = dialog.querySelectorAll('footer button');
			expect(buttons.length).toBe(1);
			expect(buttons[0]!.textContent).toBe('キャンセル');
		});
	});

	describe('open', () => {
		test('should create element with data-bge-editor-ui="blockCatalog"', () => {
			const settings = createDefaultSettings();
			const dialog = new BlockCatalogDialog(mockCatalog, settings);

			const dialogEl = document.body.querySelector('dialog')!;
			dialogEl.showModal = vi.fn();

			dialog.open();

			const editorUi = dialog.find('[data-bge-editor-ui="blockCatalog"]');
			expect(editorUi).not.toBeNull();
		});

		test('should call createEditorComponent for the blockCatalog element', () => {
			const settings = createDefaultSettings();
			const dialog = new BlockCatalogDialog(mockCatalog, settings);

			const dialogEl = document.body.querySelector('dialog')!;
			dialogEl.showModal = vi.fn();

			dialog.open();

			expect(settings.createEditorComponent).toHaveBeenCalled();
		});
	});

	describe('addBlock', () => {
		test('should call settings.addBlock with the block data', async () => {
			const settings = createDefaultSettings();
			const dialog = new BlockCatalogDialog(mockCatalog, settings);

			const dialogEl = document.body.querySelector('dialog')!;
			dialogEl.close = vi.fn();

			const blockData = {
				name: 'test-block',
				containerProps: {},
				items: [[{ name: 'text' }]],
			};
			await dialog.addBlock(blockData as never);

			expect(settings.addBlock).toHaveBeenCalledWith(blockData);
		});

		test('should close the dialog after adding block', async () => {
			const settings = createDefaultSettings();
			const dialog = new BlockCatalogDialog(mockCatalog, settings);

			const dialogEl = document.body.querySelector('dialog')!;
			dialogEl.close = vi.fn();

			await dialog.addBlock({
				name: 'test',
				containerProps: {},
				items: [],
			} as never);

			expect(dialogEl.close).toHaveBeenCalled();
		});
	});
});
