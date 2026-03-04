import { test, expect, beforeEach, describe, vi } from 'vitest';

import { ComponentObserver } from '../../../core/src/component-observer.js';
import { EngineState } from '../engine-state.svelte.js';

describe('EngineState', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	test('should initialize with null values', () => {
		const engine = { componentObserver: new ComponentObserver() };
		const state = new EngineState(engine as never);

		expect(state.selectedBlock).toBeNull();
		expect(state.fileSelection).toBeNull();
		expect(state.uploadProgress).toBeNull();
		expect(state.fileList).toBeNull();
		expect(state.openEditor).toBeNull();
		expect(state.selectedTabIndex).toBe(0);
	});

	describe('select-block', () => {
		test('should update selectedBlock on event', () => {
			const engine = { componentObserver: new ComponentObserver() };
			const state = new EngineState(engine as never);

			const payload = {
				block: {} as never,
				width: 100,
				height: 200,
				x: 10,
				y: 20,
				marginBlockEnd: 16,
			};
			engine.componentObserver.notify('select-block', payload);

			expect(state.selectedBlock).toEqual(payload);
		});
	});

	describe('file-select', () => {
		test('should update fileSelection on event', () => {
			const engine = { componentObserver: new ComponentObserver() };
			const state = new EngineState(engine as never);

			const payload = {
				path: '/images/test.jpg',
				fileSize: 1024,
				isEmpty: false,
			};
			engine.componentObserver.notify('file-select', payload);

			expect(state.fileSelection).toEqual(payload);
		});
	});

	describe('file-upload-progress', () => {
		test('should update uploadProgress on event', () => {
			const engine = { componentObserver: new ComponentObserver() };
			const state = new EngineState(engine as never);

			const payload = {
				blob: 'blob:http://localhost/abc',
				uploaded: 50,
				total: 100,
			};
			engine.componentObserver.notify('file-upload-progress', payload);

			expect(state.uploadProgress).toEqual(payload);
		});
	});

	describe('file-listup', () => {
		test('should update fileList on event', () => {
			const engine = { componentObserver: new ComponentObserver() };
			const state = new EngineState(engine as never);

			const payload = {
				fileType: 'image' as const,
				data: [
					{
						fileId: '1',
						name: 'test.jpg',
						url: '/images/test.jpg',
						size: 1024,
						timestamp: Date.now(),
						sizes: {},
					},
				],
			};
			engine.componentObserver.notify('file-listup', payload);

			expect(state.fileList).toEqual(payload);
		});
	});

	describe('open-editor', () => {
		test('should update openEditor on event', () => {
			const engine = { componentObserver: new ComponentObserver() };
			const state = new EngineState(engine as never);

			const payload = {
				data: { th: ['A'], td: ['B'] },
				editor: {} as never,
			};
			engine.componentObserver.notify('open-editor', payload);

			expect(state.openEditor).toEqual(payload);
		});
	});

	describe('select-tab-in-item-editor', () => {
		test('should update selectedTabIndex on event', () => {
			const engine = { componentObserver: new ComponentObserver() };
			const state = new EngineState(engine as never);

			engine.componentObserver.notify('select-tab-in-item-editor', { index: 1 });

			expect(state.selectedTabIndex).toBe(1);
		});
	});

	describe('notify', () => {
		test('should delegate to componentObserver.notify', () => {
			const observer = new ComponentObserver();
			const engine = { componentObserver: observer };
			const state = new EngineState(engine as never);

			const handler = vi.fn();
			observer.on('file-select', handler);

			state.notify('file-select', {
				path: '/test.jpg',
				fileSize: 512,
				isEmpty: false,
			});

			expect(handler).toHaveBeenCalledWith({
				path: '/test.jpg',
				fileSize: 512,
				isEmpty: false,
			});
		});
	});

	describe('multiple events', () => {
		test('should track latest value for each action', () => {
			const engine = { componentObserver: new ComponentObserver() };
			const state = new EngineState(engine as never);

			engine.componentObserver.notify('file-select', {
				path: '/first.jpg',
				fileSize: 100,
				isEmpty: false,
			});

			engine.componentObserver.notify('file-select', {
				path: '/second.jpg',
				fileSize: 200,
				isEmpty: false,
			});

			expect(state.fileSelection?.path).toBe('/second.jpg');
		});
	});
});
