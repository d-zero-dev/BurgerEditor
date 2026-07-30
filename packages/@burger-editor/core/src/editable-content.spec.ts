import type { BurgerEditorEngine } from './engine/engine.js';
import type { EditableAreaHost } from './types.js';

import { test, expect, beforeEach, describe, vi } from 'vitest';

import { EditableContent } from './editable-content.js';

/**
 *
 */
function createMockEngine() {
	return {
		isProcessed: false,
		save: vi.fn(),
		restoreBlockFromElement: vi.fn().mockResolvedValue({
			el: document.createElement('div'),
		}),
		migrationCheck: vi.fn(),
	} as unknown as BurgerEditorEngine;
}

/**
 * UI層のhostを模したフェイク。containerElementだけを提供する
 * @param withAnimation - animateInsertionフックを持たせるか
 */
function createFakeHost(withAnimation = false) {
	const containerElement = document.createElement('div');
	document.body.append(containerElement);
	const animateInsertion = withAnimation ? vi.fn().mockResolvedValue() : undefined;
	const host: EditableAreaHost = { containerElement, animateInsertion };
	return { host, containerElement, animateInsertion };
}

describe('EditableContent', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	describe('constructor', () => {
		test('should set type property', () => {
			const { host } = createFakeHost();
			const content = new EditableContent('main', '', createMockEngine(), host);

			expect(content.type).toBe('main');
		});

		test('should support draft type', () => {
			const { host } = createFakeHost();
			const content = new EditableContent('draft', '', createMockEngine(), host);

			expect(content.type).toBe('draft');
		});

		test('should adopt the host container element', () => {
			const { host, containerElement } = createFakeHost();
			const content = new EditableContent('main', '', createMockEngine(), host);

			expect(content.containerElement).toBe(containerElement);
		});

		test('should have an insertionPoint', () => {
			const { host } = createFakeHost();
			const content = new EditableContent('main', '', createMockEngine(), host);

			expect(content.insertionPoint).toBeDefined();
		});
	});

	describe('getContentsAsString / setContentsAsString', () => {
		test('should get initial content', () => {
			const { host } = createFakeHost();
			const content = new EditableContent(
				'main',
				'<p>Hello</p>',
				createMockEngine(),
				host,
			);

			expect(content.getContentsAsString()).toBe('<p>Hello</p>');
		});

		test('should set content as string', () => {
			const { host } = createFakeHost();
			const content = new EditableContent('main', '', createMockEngine(), host);

			content.setContentsAsString('<div>New content</div>');

			expect(content.getContentsAsString()).toBe('<div>New content</div>');
		});

		test('should trim whitespace', () => {
			const { host } = createFakeHost();
			const content = new EditableContent('main', '', createMockEngine(), host);

			content.setContentsAsString('  <p>spaced</p>  ');

			expect(content.getContentsAsString()).toBe('<p>spaced</p>');
		});
	});

	describe('isEmpty', () => {
		test('should return true when content is empty', () => {
			const { host } = createFakeHost();
			const content = new EditableContent('main', '', createMockEngine(), host);

			expect(content.isEmpty()).toBe(true);
		});

		test('should return false when content exists', () => {
			const { host } = createFakeHost();
			const content = new EditableContent(
				'main',
				'<p>content</p>',
				createMockEngine(),
				host,
			);

			expect(content.isEmpty()).toBe(false);
		});
	});

	describe('isSame', () => {
		test('should return true when contents are identical', () => {
			const engine = createMockEngine();
			const main = new EditableContent(
				'main',
				'<p>same</p>',
				engine,
				createFakeHost().host,
			);
			const draft = new EditableContent(
				'draft',
				'<p>same</p>',
				engine,
				createFakeHost().host,
			);

			expect(main.isSame(draft)).toBe(true);
		});

		test('should return false when contents differ', () => {
			const engine = createMockEngine();
			const main = new EditableContent(
				'main',
				'<p>first</p>',
				engine,
				createFakeHost().host,
			);
			const draft = new EditableContent(
				'draft',
				'<p>second</p>',
				engine,
				createFakeHost().host,
			);

			expect(main.isSame(draft)).toBe(false);
		});
	});

	describe('save', () => {
		test('should accept optional content parameter', () => {
			const { host } = createFakeHost();
			const content = new EditableContent('main', '', createMockEngine(), host);

			content.save('<p>new content</p>');

			expect(content.getContentsAsString()).toBe('<p>new content</p>');
		});
	});

	describe('setContentsAsDOM', () => {
		test('should replace content with DOM element', () => {
			const { host } = createFakeHost();
			const content = new EditableContent('main', '<p>old</p>', createMockEngine(), host);

			const newEl = document.createElement('div');
			newEl.textContent = 'new content';
			content.setContentsAsDOM(newEl);

			expect(content.containerElement.contains(newEl)).toBe(true);
		});
	});

	describe('animateInsertion', () => {
		test('should delegate to the host hook', async () => {
			const { host, animateInsertion } = createFakeHost(true);
			const content = new EditableContent('main', '', createMockEngine(), host);
			const marker = document.createElement('div');

			await content.animateInsertion(marker);

			expect(animateInsertion).toHaveBeenCalledWith(marker);
		});

		test('should resolve immediately when the host has no hook (headless)', async () => {
			const { host } = createFakeHost();
			const content = new EditableContent('main', '', createMockEngine(), host);

			await expect(
				content.animateInsertion(document.createElement('div')),
			).resolves.toBeUndefined();
		});
	});
});
