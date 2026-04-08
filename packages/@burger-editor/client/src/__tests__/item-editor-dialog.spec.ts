import { test, expect, beforeEach, describe, vi } from 'vitest';

import { ComponentObserver } from '../../../core/src/component-observer.js';
import { ItemEditorDialog } from '../../../core/src/item-editor-dialog.js';

/**
 *
 * @param templateHtml
 */
function createMockSettings(templateHtml = '') {
	return {
		config: {
			classList: [],
			googleMapsApiKey: null,
			sampleImagePath: '',
			sampleFilePath: '',
			stylesheets: [],
		},
		onOpened: vi.fn(),
		getComponentObserver: () => new ComponentObserver(),
		getTemplate: vi
			.fn()
			.mockReturnValue(
				templateHtml
					? document.createRange().createContextualFragment(templateHtml).children
					: null,
			),
		getContentStylesheet: vi.fn().mockResolvedValue(''),
		onClosed: vi.fn(),
		onOpen: vi.fn(),
		createEditorComponent: vi.fn(),
	};
}

describe('ItemEditorDialog', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	describe('constructor', () => {
		test('should create dialog with cancel and submit buttons', () => {
			const settings = createMockSettings();
			new ItemEditorDialog(settings);

			const dialog = document.body.querySelector('dialog')!;
			const buttons = dialog.querySelectorAll('footer button');
			expect(buttons.length).toBe(2);
			expect(buttons[0]!.textContent).toBe('キャンセル');
			expect(buttons[1]!.textContent).toBe('決定');
		});

		test('should store config', () => {
			const settings = createMockSettings();
			const dialog = new ItemEditorDialog(settings);

			expect(dialog.config).toBe(settings.config);
		});
	});

	describe('get', () => {
		test('should get value from input element', () => {
			const settings = createMockSettings('<input name="bge-title" value="Hello">');
			const dialog = new ItemEditorDialog(settings);

			const dialogEl = document.body.querySelector('dialog')!;
			dialogEl.showModal = vi.fn();

			const template = settings.getTemplate('test');
			dialog.setTemplate(...template!);

			const value = dialog.get('$title');
			expect(value).toBe('Hello');
		});

		test('should get value from textarea element', () => {
			const settings = createMockSettings(
				'<textarea name="bge-content">Some content</textarea>',
			);
			const dialog = new ItemEditorDialog(settings);

			const dialogEl = document.body.querySelector('dialog')!;
			dialogEl.showModal = vi.fn();

			const template = settings.getTemplate('test');
			dialog.setTemplate(...template!);

			const value = dialog.get('$content');
			expect(value).toBe('Some content');
		});

		test('should get value from select element', () => {
			const settings = createMockSettings(
				'<select name="bge-size"><option value="small">Small</option><option value="large" selected>Large</option></select>',
			);
			const dialog = new ItemEditorDialog(settings);

			const template = settings.getTemplate('test');
			dialog.setTemplate(...template!);

			const value = dialog.get('$size');
			expect(value).toBe('large');
		});

		test('should get checked value from radio buttons', () => {
			const settings = createMockSettings(
				'<input type="radio" name="bge-align" value="left"><input type="radio" name="bge-align" value="center" checked>',
			);
			const dialog = new ItemEditorDialog(settings);

			const template = settings.getTemplate('test');
			dialog.setTemplate(...template!);

			const value = dialog.get('$align');
			expect(value).toBe('center');
		});

		test('should get boolean from checkbox', () => {
			const settings = createMockSettings(
				'<input type="checkbox" name="bge-visible" checked>',
			);
			const dialog = new ItemEditorDialog(settings);

			const template = settings.getTemplate('test');
			dialog.setTemplate(...template!);

			const value = dialog.get('$visible');
			expect(value).toBe(true);
		});

		test('should throw when element not found', () => {
			const settings = createMockSettings('');
			const dialog = new ItemEditorDialog(settings);

			expect(() => dialog.get('$nonexistent')).toThrow();
		});
	});

	describe('update', () => {
		test('should update input value', () => {
			const settings = createMockSettings('<input name="bge-title" value="">');
			const dialog = new ItemEditorDialog(settings);

			const template = settings.getTemplate('test');
			dialog.setTemplate(...template!);

			dialog.update('$title', 'New Title');

			const input = dialog.find<HTMLInputElement>('[name="bge-title"]')!;
			expect(input.value).toBe('New Title');
		});

		test('should update checkbox state', () => {
			const settings = createMockSettings('<input type="checkbox" name="bge-active">');
			const dialog = new ItemEditorDialog(settings);

			const template = settings.getTemplate('test');
			dialog.setTemplate(...template!);

			dialog.update('$active', true as never);

			const checkbox = dialog.find<HTMLInputElement>('[name="bge-active"]')!;
			expect(checkbox.checked).toBe(true);
		});

		test('should update radio button selection', () => {
			const settings = createMockSettings(
				'<input type="radio" name="bge-align" value="left"><input type="radio" name="bge-align" value="right">',
			);
			const dialog = new ItemEditorDialog(settings);

			const template = settings.getTemplate('test');
			dialog.setTemplate(...template!);

			dialog.update('$align', 'right' as never);

			const radios = dialog.findAll<HTMLInputElement>('[name="bge-align"]');
			const rightRadio = radios.find(
				(r) => r instanceof HTMLInputElement && r.value === 'right',
			) as HTMLInputElement;
			expect(rightRadio.checked).toBe(true);
		});

		test('should accept a function as value', () => {
			const settings = createMockSettings('<input name="bge-count" value="5">');
			const dialog = new ItemEditorDialog(settings);

			const template = settings.getTemplate('test');
			dialog.setTemplate(...template!);

			dialog.update('$count', (current: unknown) => String(Number(current) + 1));

			const input = dialog.find<HTMLInputElement>('[name="bge-count"]')!;
			expect(input.value).toBe('6');
		});
	});

	describe('onChange', () => {
		test('should call handler on initial call when runOnInit is true', () => {
			const settings = createMockSettings('<input name="bge-title" value="initial">');
			const dialog = new ItemEditorDialog(settings);

			const template = settings.getTemplate('test');
			dialog.setTemplate(...template!);

			const handler = vi.fn();
			dialog.onChange('$title', handler, true);

			expect(handler).toHaveBeenCalledWith('initial', null);
		});

		test('should not call handler initially when runOnInit is false', () => {
			const settings = createMockSettings('<input name="bge-title" value="initial">');
			const dialog = new ItemEditorDialog(settings);

			const template = settings.getTemplate('test');
			dialog.setTemplate(...template!);

			const handler = vi.fn();
			dialog.onChange('$title', handler, false);

			expect(handler).not.toHaveBeenCalled();
		});

		test('should call handler on change event with initial value as old value after runOnInit', () => {
			const settings = createMockSettings('<input name="bge-title" value="old">');
			const dialog = new ItemEditorDialog(settings);

			const template = settings.getTemplate('test');
			dialog.setTemplate(...template!);

			const handler = vi.fn();
			dialog.onChange('$title', handler, true);
			handler.mockClear();

			const input = dialog.find<HTMLInputElement>('[name="bge-title"]')!;
			input.value = 'new';
			input.dispatchEvent(new Event('change'));

			expect(handler).toHaveBeenCalledWith('new', 'old');
		});

		test('should track old values after first change event', () => {
			const settings = createMockSettings('<input name="bge-title" value="initial">');
			const dialog = new ItemEditorDialog(settings);

			const template = settings.getTemplate('test');
			dialog.setTemplate(...template!);

			const handler = vi.fn();
			dialog.onChange('$title', handler, false);

			const input = dialog.find<HTMLInputElement>('[name="bge-title"]')!;
			input.value = 'first';
			input.dispatchEvent(new Event('change'));
			handler.mockClear();

			input.value = 'second';
			input.dispatchEvent(new Event('change'));

			expect(handler).toHaveBeenCalledWith('second', 'first');
		});

		test('should not call handler when value is same as tracked value', () => {
			const settings = createMockSettings('<input name="bge-title" value="same">');
			const dialog = new ItemEditorDialog(settings);

			const template = settings.getTemplate('test');
			dialog.setTemplate(...template!);

			const handler = vi.fn();
			dialog.onChange('$title', handler, false);

			const input = dialog.find<HTMLInputElement>('[name="bge-title"]')!;

			// First change event stores value in #values
			input.dispatchEvent(new Event('change'));
			handler.mockClear();

			// Second change event with same value should not call handler
			input.dispatchEvent(new Event('change'));

			expect(handler).not.toHaveBeenCalled();
		});
	});

	describe('disable', () => {
		test('should disable input elements', () => {
			const settings = createMockSettings('<input name="bge-title" value="test">');
			const dialog = new ItemEditorDialog(settings);

			const template = settings.getTemplate('test');
			dialog.setTemplate(...template!);

			dialog.disable('$title');

			const input = dialog.find<HTMLInputElement>('[name="bge-title"]')!;
			expect(input.disabled).toBe(true);
		});

		test('should enable input elements when disabled=false', () => {
			const settings = createMockSettings(
				'<input name="bge-title" value="test" disabled>',
			);
			const dialog = new ItemEditorDialog(settings);

			const template = settings.getTemplate('test');
			dialog.setTemplate(...template!);

			dialog.disable('$title', false);

			const input = dialog.find<HTMLInputElement>('[name="bge-title"]')!;
			expect(input.disabled).toBe(false);
		});
	});

	describe('componentObserver', () => {
		test('should return ComponentObserver from getter', () => {
			const settings = createMockSettings();
			const dialog = new ItemEditorDialog(settings);

			expect(dialog.componentObserver).toBeInstanceOf(ComponentObserver);
		});
	});

	describe('max', () => {
		test('should set max attribute on input', () => {
			const settings = createMockSettings(
				'<input type="number" name="bge-count" value="5">',
			);
			const dialog = new ItemEditorDialog(settings);

			const template = settings.getTemplate('test');
			dialog.setTemplate(...template!);

			dialog.max('$count', 100);

			const input = dialog.find<HTMLInputElement>('[name="bge-count"]')!;
			expect(input.max).toBe('100');
		});
	});
});
