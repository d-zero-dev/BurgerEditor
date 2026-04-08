import { test, expect, beforeEach, describe, vi } from 'vitest';

import { EditableArea } from './editable-area.js';

/**
 *
 */
function createMockEngine() {
	const viewArea = document.createElement('div');
	document.body.append(viewArea);

	return {
		viewArea,
		isProcessed: false,
		componentObserver: {
			on: vi.fn(),
			off: vi.fn(),
			notify: vi.fn(),
		},
		clearCurrentBlock: vi.fn(),
		content: {
			containerElement: document.createElement('div'),
			update: vi.fn(),
		},
		save: vi.fn(),
		blockCatalogDialog: {
			open: vi.fn(),
		},
		restoreBlockFromElement: vi.fn().mockResolvedValue({
			el: document.createElement('div'),
		}),
		migrationCheck: vi.fn(),
		el: document.createElement('div'),
	} as unknown;
}

/**
 *
 */
function createMockBlockMenuCreator() {
	return vi.fn().mockReturnValue({ cleanUp: vi.fn() });
}

describe('EditableArea', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	describe('constructor', () => {
		test('should create iframe and textarea elements', () => {
			const engine = createMockEngine();
			const ea = new EditableArea(
				'main',
				'<p>Hello</p>',
				engine,
				createMockBlockMenuCreator(),
			);

			const iframe = ea.el.querySelector('iframe');
			const textarea = ea.el.querySelector('textarea');

			expect(iframe).not.toBeNull();
			expect(textarea).not.toBeNull();
		});

		test('should set type property', () => {
			const engine = createMockEngine();
			const ea = new EditableArea('main', '', engine, createMockBlockMenuCreator());

			expect(ea.type).toBe('main');
		});

		test('should set data-bge-component attribute', () => {
			const engine = createMockEngine();
			const ea = new EditableArea('main', '', engine, createMockBlockMenuCreator());

			expect(ea.el.dataset.bgeComponent).toBe('main-editable-area');
		});

		test('should support draft type', () => {
			const engine = createMockEngine();
			const ea = new EditableArea('draft', '', engine, createMockBlockMenuCreator());

			expect(ea.type).toBe('draft');
			expect(ea.el.dataset.bgeComponent).toBe('draft-editable-area');
		});

		test('should append element to engine.viewArea', () => {
			const engine = createMockEngine();
			const ea = new EditableArea('main', '', engine, createMockBlockMenuCreator());

			expect(engine.viewArea.contains(ea.el)).toBe(true);
		});

		test('should have an insertionPoint', () => {
			const engine = createMockEngine();
			const ea = new EditableArea('main', '', engine, createMockBlockMenuCreator());

			expect(ea.insertionPoint).toBeDefined();
		});

		test('should have a blockMenu', () => {
			const engine = createMockEngine();
			const ea = new EditableArea('main', '', engine, createMockBlockMenuCreator());

			expect(ea.blockMenu).toBeDefined();
		});
	});

	describe('getContentsAsString / setContentsAsString', () => {
		test('should get initial content', () => {
			const engine = createMockEngine();
			const ea = new EditableArea(
				'main',
				'<p>Hello</p>',
				engine,
				createMockBlockMenuCreator(),
			);

			expect(ea.getContentsAsString()).toBe('<p>Hello</p>');
		});

		test('should set content as string', () => {
			const engine = createMockEngine();
			const ea = new EditableArea('main', '', engine, createMockBlockMenuCreator());

			ea.setContentsAsString('<div>New content</div>');

			expect(ea.getContentsAsString()).toBe('<div>New content</div>');
		});

		test('should trim whitespace', () => {
			const engine = createMockEngine();
			const ea = new EditableArea('main', '', engine, createMockBlockMenuCreator());

			ea.setContentsAsString('  <p>spaced</p>  ');

			expect(ea.getContentsAsString()).toBe('<p>spaced</p>');
		});
	});

	describe('isEmpty', () => {
		test('should return true when content is empty', () => {
			const engine = createMockEngine();
			const ea = new EditableArea('main', '', engine, createMockBlockMenuCreator());

			expect(ea.isEmpty()).toBe(true);
		});

		test('should return false when content exists', () => {
			const engine = createMockEngine();
			const ea = new EditableArea(
				'main',
				'<p>content</p>',
				engine,
				createMockBlockMenuCreator(),
			);

			expect(ea.isEmpty()).toBe(false);
		});
	});

	describe('isSame', () => {
		test('should return true when contents are identical', () => {
			const engine = createMockEngine();
			const ea1 = new EditableArea(
				'main',
				'<p>same</p>',
				engine,
				createMockBlockMenuCreator(),
			);
			const ea2 = new EditableArea(
				'draft',
				'<p>same</p>',
				engine,
				createMockBlockMenuCreator(),
			);

			expect(ea1.isSame(ea2)).toBe(true);
		});

		test('should return false when contents differ', () => {
			const engine = createMockEngine();
			const ea1 = new EditableArea(
				'main',
				'<p>first</p>',
				engine,
				createMockBlockMenuCreator(),
			);
			const ea2 = new EditableArea(
				'draft',
				'<p>second</p>',
				engine,
				createMockBlockMenuCreator(),
			);

			expect(ea1.isSame(ea2)).toBe(false);
		});
	});

	describe('save', () => {
		test('should update textarea with current content', () => {
			const engine = createMockEngine();
			const ea = new EditableArea(
				'main',
				'<p>content</p>',
				engine,
				createMockBlockMenuCreator(),
			);

			ea.save();

			const textarea = ea.el.querySelector('textarea')!;
			expect(textarea.value).toBe('<p>content</p>');
		});

		test('should accept optional content parameter', () => {
			const engine = createMockEngine();
			const ea = new EditableArea('main', '', engine, createMockBlockMenuCreator());

			ea.save('<p>new content</p>');

			expect(ea.getContentsAsString()).toBe('<p>new content</p>');
		});
	});

	describe('setContentsAsDOM', () => {
		test('should replace content with DOM element', () => {
			const engine = createMockEngine();
			const ea = new EditableArea(
				'main',
				'<p>old</p>',
				engine,
				createMockBlockMenuCreator(),
			);

			const newEl = document.createElement('div');
			newEl.textContent = 'new content';
			ea.setContentsAsDOM(newEl);

			expect(ea.containerElement.contains(newEl)).toBe(true);
		});
	});

	describe('toggleDisplayMode', () => {
		test('should switch between visual and source modes', () => {
			const engine = createMockEngine();
			const ea = new EditableArea(
				'main',
				'<p>content</p>',
				engine,
				createMockBlockMenuCreator(),
			);

			expect(ea.isVisualMode).toBe(true);

			ea.toggleDisplayMode();

			expect(ea.isVisualMode).toBe(false);
			expect(ea.el.dataset.bgeComponentMode).toBe('source');

			ea.toggleDisplayMode();

			expect(ea.isVisualMode).toBe(true);
			expect(ea.el.dataset.bgeComponentMode).toBe('visual');
		});

		test('should toggle iframe and textarea visibility', () => {
			const engine = createMockEngine();
			const ea = new EditableArea(
				'main',
				'<p>content</p>',
				engine,
				createMockBlockMenuCreator(),
			);

			const iframe = ea.el.querySelector('iframe')!;
			const textarea = ea.el.querySelector('textarea')!;

			// Initial state (constructor doesn't call #switchMode — that happens in #init)
			// After first toggle: switches to source mode
			ea.toggleDisplayMode();
			expect(ea.isVisualMode).toBe(false);
			expect(iframe.hidden).toBe(true);
			expect(textarea.hidden).toBe(false);

			// After second toggle: back to visual mode
			ea.toggleDisplayMode();
			expect(ea.isVisualMode).toBe(true);
			expect(iframe.hidden).toBe(false);
			expect(textarea.hidden).toBe(true);
		});
	});

	describe('containerElement', () => {
		test('should expose container element', () => {
			const engine = createMockEngine();
			const ea = new EditableArea(
				'main',
				'<p>content</p>',
				engine,
				createMockBlockMenuCreator(),
			);

			expect(ea.containerElement).toBeDefined();
			expect(ea.containerElement.id).toBe('bge-editable-area');
		});

		test('should have editable-area data attribute', () => {
			const engine = createMockEngine();
			const ea = new EditableArea('main', '', engine, createMockBlockMenuCreator());

			expect(ea.containerElement.dataset.bgeComponent).toBe('editable-area');
		});
	});
});
