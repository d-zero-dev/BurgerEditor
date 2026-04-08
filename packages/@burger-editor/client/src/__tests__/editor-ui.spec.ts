import { test, expect, beforeEach, describe } from 'vitest';

import { EditorUI } from '../../../core/src/editor-ui.js';

class ConcreteEditorUI extends EditorUI {
	constructor(
		name: string,
		elOrSelector: HTMLElement | string,
		options?: { stylesheet?: string },
	) {
		super(name, elOrSelector, options);
	}
}

describe('EditorUI', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	describe('constructor', () => {
		test('should set data-bge-component attribute on element', () => {
			const el = document.createElement('div');
			const ui = new ConcreteEditorUI('test-component', el);

			expect(ui.el.dataset.bgeComponent).toBe('test-component');
		});

		test('should accept an HTMLElement directly', () => {
			const el = document.createElement('div');
			const ui = new ConcreteEditorUI('my-ui', el);

			expect(ui.el).toBe(el);
		});

		test('should accept a selector string', () => {
			const el = document.createElement('div');
			el.id = 'target';
			document.body.append(el);

			const ui = new ConcreteEditorUI('my-ui', '#target');

			expect(ui.el).toBe(el);
		});

		test('should throw when selector does not match any element', () => {
			expect(() => new ConcreteEditorUI('my-ui', '#nonexistent')).toThrow();
		});
	});

	describe('hide', () => {
		test('should set hidden to true', () => {
			const el = document.createElement('div');
			const ui = new ConcreteEditorUI('test', el);

			ui.hide();

			expect(ui.el.hidden).toBe(true);
		});
	});

	describe('show', () => {
		test('should set hidden to false', () => {
			const el = document.createElement('div');
			const ui = new ConcreteEditorUI('test', el);

			ui.hide();
			ui.show();

			expect(ui.el.hidden).toBe(false);
		});
	});

	describe('visible', () => {
		test('should return false when element is hidden', () => {
			const el = document.createElement('div');
			const ui = new ConcreteEditorUI('test', el);

			ui.hide();

			expect(ui.visible()).toBe(false);
		});

		test('should return true when element is visible', () => {
			const el = document.createElement('div');
			const ui = new ConcreteEditorUI('test', el);

			expect(ui.visible()).toBe(true);
		});
	});
});
