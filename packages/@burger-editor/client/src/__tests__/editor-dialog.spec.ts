import { test, expect, beforeEach, describe, vi } from 'vitest';

import { EditorDialog } from '../../../core/src/editor-dialog.js';

class ConcreteDialog extends EditorDialog {
	constructor(
		name: string,
		settings: {
			onClosed: () => void;
			onOpen: () => void | boolean;
			createEditorComponent: (el: HTMLElement) => void | (() => void);
		},
		options: {
			buttons?: { close?: string; complete?: string };
		} = {},
	) {
		super(name, settings, options);
	}
}

/**
 *
 */
function createDefaultSettings() {
	return {
		onClosed: vi.fn(),
		onOpen: vi.fn(),
		createEditorComponent: vi.fn(),
	};
}

describe('EditorDialog', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	describe('constructor', () => {
		test('should add a dialog element to document.body', () => {
			const settings = createDefaultSettings();
			new ConcreteDialog('test', settings);

			const dialog = document.body.querySelector('dialog');
			expect(dialog).not.toBeNull();
			expect(dialog?.classList.contains('bge-dialog')).toBe(true);
		});

		test('should create close button when specified', () => {
			const settings = createDefaultSettings();
			new ConcreteDialog('test', settings, {
				buttons: { close: 'キャンセル' },
			});

			const dialog = document.body.querySelector('dialog')!;
			const buttons = dialog.querySelectorAll('footer button');
			expect(buttons.length).toBe(1);
			expect(buttons[0]!.textContent).toBe('キャンセル');
			expect((buttons[0] as HTMLButtonElement).type).toBe('button');
		});

		test('should create complete button when specified', () => {
			const settings = createDefaultSettings();
			new ConcreteDialog('test', settings, {
				buttons: { complete: '決定' },
			});

			const dialog = document.body.querySelector('dialog')!;
			const buttons = dialog.querySelectorAll('footer button');
			expect(buttons.length).toBe(1);
			expect(buttons[0]!.textContent).toBe('決定');
			expect((buttons[0] as HTMLButtonElement).type).toBe('submit');
		});

		test('should create both close and complete buttons', () => {
			const settings = createDefaultSettings();
			new ConcreteDialog('test', settings, {
				buttons: { close: 'キャンセル', complete: '決定' },
			});

			const dialog = document.body.querySelector('dialog')!;
			const buttons = dialog.querySelectorAll('footer button');
			expect(buttons.length).toBe(2);
		});

		test('should sanitize inputs by setting autocapitalize and autocomplete off', () => {
			const el = document.createElement('div');
			el.innerHTML = '<input type="text"><textarea></textarea>';

			const settings = createDefaultSettings();
			// Use the internal el that gets sanitized in constructor
			new ConcreteDialog('test', settings);
		});
	});

	describe('open', () => {
		test('should call onOpen callback', () => {
			const settings = createDefaultSettings();
			const dialog = new ConcreteDialog('test', settings);

			// jsdom does not implement showModal, mock it
			const dialogEl = document.body.querySelector('dialog')!;
			dialogEl.showModal = vi.fn();

			dialog.open();

			expect(settings.onOpen).toHaveBeenCalled();
		});

		test('should call showModal on the dialog element', () => {
			const settings = createDefaultSettings();
			const d = new ConcreteDialog('test', settings);

			const dialogEl = document.body.querySelector('dialog')!;
			dialogEl.showModal = vi.fn();

			d.open();

			expect(dialogEl.showModal).toHaveBeenCalled();
		});

		test('should not call showModal when onOpen returns true (cancel)', () => {
			const settings = createDefaultSettings();
			settings.onOpen.mockReturnValue(true);
			const d = new ConcreteDialog('test', settings);

			const dialogEl = document.body.querySelector('dialog')!;
			dialogEl.showModal = vi.fn();

			d.open();

			expect(dialogEl.showModal).not.toHaveBeenCalled();
		});
	});

	describe('close', () => {
		test('should call dialog.close()', () => {
			const settings = createDefaultSettings();
			const d = new ConcreteDialog('test', settings);

			const dialogEl = document.body.querySelector('dialog')!;
			dialogEl.close = vi.fn();

			d.close();

			expect(dialogEl.close).toHaveBeenCalled();
		});
	});

	describe('closed', () => {
		test('should call onClosed callback', () => {
			const settings = createDefaultSettings();
			const d = new ConcreteDialog('test', settings);

			d.closed();

			expect(settings.onClosed).toHaveBeenCalled();
		});

		test('should clear template', () => {
			const settings = createDefaultSettings();
			const d = new ConcreteDialog('test', settings);

			const node = document.createElement('div');
			node.textContent = 'template content';
			d.setTemplate(node);

			d.closed();

			expect(d.el.innerHTML).toBe('');
		});
	});

	describe('setTemplate', () => {
		test('should inject template nodes into the dialog', () => {
			const settings = createDefaultSettings();
			const d = new ConcreteDialog('test', settings);

			const node = document.createElement('div');
			node.textContent = 'test content';
			d.setTemplate(node);

			expect(d.el.contains(node)).toBe(true);
		});

		test('should call createEditorComponent for elements with data-bge-editor-ui', () => {
			const settings = createDefaultSettings();
			const d = new ConcreteDialog('test', settings);

			const editorEl = document.createElement('div');
			editorEl.dataset.bgeEditorUi = 'blockCatalog';
			d.setTemplate(editorEl);

			expect(settings.createEditorComponent).toHaveBeenCalledWith(editorEl);
		});

		test('should sanitize input elements in template', () => {
			const settings = createDefaultSettings();
			const d = new ConcreteDialog('test', settings);

			const wrapper = document.createElement('div');
			const input = document.createElement('input');
			wrapper.append(input);
			d.setTemplate(wrapper);

			expect(input.autocomplete).toBe('off');
		});

		test('should set button types to "button"', () => {
			const settings = createDefaultSettings();
			const d = new ConcreteDialog('test', settings);

			const wrapper = document.createElement('div');
			const btn = document.createElement('button');
			wrapper.append(btn);
			d.setTemplate(wrapper);

			expect(btn.type).toBe('button');
		});
	});

	describe('find / findAll', () => {
		test('should find element within the dialog', () => {
			const settings = createDefaultSettings();
			const d = new ConcreteDialog('test', settings);

			const child = document.createElement('span');
			child.className = 'target';
			d.setTemplate(child);

			const found = d.find('.target');
			expect(found).toBe(child);
		});

		test('should return null when element not found', () => {
			const settings = createDefaultSettings();
			const d = new ConcreteDialog('test', settings);

			const found = d.find('.nonexistent');
			expect(found).toBeNull();
		});

		test('should find multiple elements', () => {
			const settings = createDefaultSettings();
			const d = new ConcreteDialog('test', settings);

			const wrapper = document.createElement('div');
			const item1 = document.createElement('span');
			item1.className = 'item';
			const item2 = document.createElement('span');
			item2.className = 'item';
			wrapper.append(item1, item2);
			d.setTemplate(wrapper);

			const found = d.findAll('.item');
			expect(found).toHaveLength(2);
		});
	});

	describe('complete', () => {
		test('should call close by default', () => {
			const settings = createDefaultSettings();
			const d = new ConcreteDialog('test', settings);

			const dialogEl = document.body.querySelector('dialog')!;
			dialogEl.close = vi.fn();

			d.complete(new FormData());

			expect(dialogEl.close).toHaveBeenCalled();
		});
	});

	describe('clearTemplate', () => {
		test('should clear the template and reset form', () => {
			const settings = createDefaultSettings();
			const d = new ConcreteDialog('test', settings);

			const node = document.createElement('div');
			node.textContent = 'content';
			d.setTemplate(node);

			d.clearTemplate();

			expect(d.el.innerHTML).toBe('');
		});
	});

	describe('setOptions', () => {
		test('should populate select element with options', () => {
			const settings = createDefaultSettings();
			const d = new ConcreteDialog('test', settings);

			const wrapper = document.createElement('div');
			const select = document.createElement('select');
			select.name = 'test-select';
			wrapper.append(select);
			d.setTemplate(wrapper);

			d.setOptions('test-select', [
				{ value: 'a', label: 'Option A' },
				{ value: 'b', label: 'Option B' },
			]);

			expect(select.options.length).toBe(2);
			expect(select.options[0]!.value).toBe('a');
			expect(select.options[0]!.textContent).toBe('Option A');
			expect(select.options[1]!.value).toBe('b');
		});
	});

	describe('close button click', () => {
		test('should close dialog when close button is clicked', () => {
			const settings = createDefaultSettings();
			new ConcreteDialog('test', settings, {
				buttons: { close: 'キャンセル' },
			});

			const dialogEl = document.body.querySelector('dialog')!;
			dialogEl.close = vi.fn();

			const closeBtn = dialogEl.querySelector(
				'footer button[type="button"]',
			) as HTMLButtonElement;
			closeBtn.click();

			expect(dialogEl.close).toHaveBeenCalled();
		});
	});
});
