import { test, expect, beforeEach, describe, vi } from 'vitest';

import { BlockOptionsDialog } from '../../../core/src/block-options-dialog.js';

/**
 *
 */
function createMockBlock() {
	return {
		el: document.createElement('div'),
		exportOptions: vi.fn().mockReturnValue({
			containerProps: {
				type: null,
				columns: null,
				autoRepeat: 'fixed',
				justify: null,
				align: null,
				float: null,
				linkarea: false,
				repeatMinInlineSize: null,
			},
			classList: [],
			id: null,
			style: {},
		}),
		importOptions: vi.fn(),
	} as unknown;
}

/**
 *
 * @param currentBlock
 */
function createDefaultSettings(currentBlock = createMockBlock()) {
	return {
		onClosed: vi.fn(),
		onOpen: vi.fn(),
		createEditorComponent: vi.fn(),
		onChangeBlock: vi.fn(),
		getCurrentBlock: vi.fn().mockReturnValue(currentBlock),
	};
}

describe('BlockOptionsDialog', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	describe('constructor', () => {
		test('should create dialog with close and complete buttons', () => {
			const settings = createDefaultSettings();
			new BlockOptionsDialog(settings);

			const dialog = document.body.querySelector('dialog')!;
			const buttons = dialog.querySelectorAll('footer button');
			expect(buttons.length).toBe(2);
			expect(buttons[0]!.textContent).toBe('キャンセル');
			expect(buttons[1]!.textContent).toBe('決定');
		});
	});

	describe('open', () => {
		test('should create element with data-bge-editor-ui="blockOptions"', () => {
			const settings = createDefaultSettings();
			const dialog = new BlockOptionsDialog(settings);

			const dialogEl = document.body.querySelector('dialog')!;
			dialogEl.showModal = vi.fn();

			dialog.open();

			const editorUi = dialog.find('[data-bge-editor-ui="blockOptions"]');
			expect(editorUi).not.toBeNull();
		});

		test('should call getCurrentBlock on open', () => {
			const settings = createDefaultSettings();
			const dialog = new BlockOptionsDialog(settings);

			const dialogEl = document.body.querySelector('dialog')!;
			dialogEl.showModal = vi.fn();

			dialog.open();

			expect(settings.getCurrentBlock).toHaveBeenCalled();
		});
	});

	describe('onChangeBlock', () => {
		test('should delegate to settings.onChangeBlock', () => {
			const settings = createDefaultSettings();
			const dialog = new BlockOptionsDialog(settings);
			const callback = vi.fn();

			dialog.onChangeBlock(callback);

			expect(settings.onChangeBlock).toHaveBeenCalledWith(callback);
		});
	});

	describe('setContainerProps', () => {
		test('should parse FormData and call block.importOptions', () => {
			const block = createMockBlock();
			const settings = createDefaultSettings(block);
			const dialog = new BlockOptionsDialog(settings);

			const dialogEl = document.body.querySelector('dialog')!;
			dialogEl.showModal = vi.fn();
			dialog.open();

			const formData = new FormData();
			formData.set('bge-options-container-type', 'grid');
			formData.set('bge-options-columns', '3');
			formData.set('bge-options-auto-repeat', 'auto-fill');
			formData.set('bge-options-justify', 'center');
			formData.set('bge-options-align', 'align-center');
			formData.set('bge-options-float', '');
			formData.set('bge-options-classes', 'class-a class-b');
			formData.set('bge-options-id', 'my-block');
			formData.set('bge-options-linkarea', 'false');

			dialog.setContainerProps(formData);

			expect(block.importOptions).toHaveBeenCalledOnce();
			const args = block.importOptions.mock.calls[0][0];
			expect(args.containerProps.type).toBe('grid');
			expect(args.containerProps.columns).toBe(3);
			expect(args.containerProps.autoRepeat).toBe('auto-fill');
			expect(args.containerProps.justify).toBe('center');
			expect(args.containerProps.align).toBe('align-center');
			expect(args.classList).toEqual(['class-a', 'class-b']);
			expect(args.id).toBe('my-block');
		});

		test('should handle style options from FormData', () => {
			const block = createMockBlock();
			const settings = createDefaultSettings(block);
			const dialog = new BlockOptionsDialog(settings);

			const dialogEl = document.body.querySelector('dialog')!;
			dialogEl.showModal = vi.fn();
			dialog.open();

			const formData = new FormData();
			formData.set('bge-options-container-type', '');
			formData.set('bge-options-columns', '');
			formData.set('bge-options-auto-repeat', 'fixed');
			formData.set('bge-options-classes', '');
			formData.set('bge-options-id', '');
			formData.set('bge-options-linkarea', 'false');
			formData.set('bge-options-style-background', 'blue');
			formData.set('bge-options-style-color', 'white');

			dialog.setContainerProps(formData);

			const args = block.importOptions.mock.calls[0][0];
			expect(args.style).toEqual({
				background: 'blue',
				color: 'white',
			});
		});

		test('should not call importOptions when no block is set', () => {
			const settings = createDefaultSettings();
			settings.getCurrentBlock.mockReturnValue(null);
			const dialog = new BlockOptionsDialog(settings);

			const dialogEl = document.body.querySelector('dialog')!;
			dialogEl.showModal = vi.fn();
			dialog.open();

			const formData = new FormData();
			dialog.setContainerProps(formData);

			// No block to import options on — should not throw
		});
	});

	describe('complete', () => {
		test('should call setContainerProps then close', () => {
			const block = createMockBlock();
			const settings = createDefaultSettings(block);
			const dialog = new BlockOptionsDialog(settings);

			const dialogEl = document.body.querySelector('dialog')!;
			dialogEl.showModal = vi.fn();
			dialogEl.close = vi.fn();
			dialog.open();

			const formData = new FormData();
			formData.set('bge-options-container-type', 'inline');
			formData.set('bge-options-columns', '');
			formData.set('bge-options-auto-repeat', 'fixed');
			formData.set('bge-options-classes', '');
			formData.set('bge-options-id', '');
			formData.set('bge-options-linkarea', 'false');
			dialog.complete(formData);

			expect(block.importOptions).toHaveBeenCalled();
			expect(dialogEl.close).toHaveBeenCalled();
		});
	});

	describe('reset', () => {
		test('should clear current block', () => {
			const block = createMockBlock();
			const settings = createDefaultSettings(block);
			const dialog = new BlockOptionsDialog(settings);

			const dialogEl = document.body.querySelector('dialog')!;
			dialogEl.showModal = vi.fn();
			dialog.open();

			dialog.reset();

			// After reset, setContainerProps should not call importOptions
			// because currentBlock is null
			const formData = new FormData();
			dialog.setContainerProps(formData);

			expect(block.importOptions).not.toHaveBeenCalled();
		});
	});
});
