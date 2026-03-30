import { test, expect, beforeEach, describe, vi } from 'vitest';

import { ComponentObserver } from './component-observer.js';

describe('ComponentObserver', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	describe('notify', () => {
		test('should dispatch CustomEvent on window', () => {
			const observer = new ComponentObserver();
			const handler = vi.fn();

			observer.on('select-block', handler);
			const payload = {
				block: {} as unknown,
				width: 100,
				height: 50,
				x: 10,
				y: 20,
				marginBlockEnd: 0,
			};
			observer.notify('select-block', payload);

			expect(handler).toHaveBeenCalledWith(payload);
		});

		test('should pass correct payload to listener', () => {
			const observer = new ComponentObserver();
			const handler = vi.fn();

			observer.on('file-select', handler);

			const payload = {
				path: '/test/image.png',
				fileSize: 1024,
				isEmpty: false,
			};
			observer.notify('file-select', payload);

			expect(handler).toHaveBeenCalledOnce();
			expect(handler).toHaveBeenCalledWith(payload);
		});
	});

	describe('on', () => {
		test('should register listener that receives events', () => {
			const observer = new ComponentObserver();
			const handler = vi.fn();

			observer.on('file-upload-progress', handler);

			const payload = { blob: 'data:image/png', uploaded: 50, total: 100 };
			observer.notify('file-upload-progress', payload);

			expect(handler).toHaveBeenCalledWith(payload);
		});

		test('should support multiple listeners for the same action', () => {
			const observer = new ComponentObserver();
			const handler1 = vi.fn();
			const handler2 = vi.fn();

			observer.on('select-block', handler1);
			observer.on('select-block', handler2);

			const payload = {
				block: {} as unknown,
				width: 100,
				height: 50,
				x: 0,
				y: 0,
				marginBlockEnd: 0,
			};
			observer.notify('select-block', payload);

			expect(handler1).toHaveBeenCalledWith(payload);
			expect(handler2).toHaveBeenCalledWith(payload);
		});
	});

	describe('off', () => {
		test('should call removeEventListener', () => {
			const observer = new ComponentObserver();
			const handler = vi.fn();

			observer.on('select-block', handler);

			const spy = vi.spyOn(window, 'removeEventListener');
			observer.off();

			expect(spy).toHaveBeenCalled();
			spy.mockRestore();
		});

		test('should stop listeners from firing after off()', () => {
			const observer = new ComponentObserver();
			const handler = vi.fn();

			observer.on('select-block', handler);
			observer.off();

			const payload = {
				block: {} as unknown,
				width: 100,
				height: 50,
				x: 0,
				y: 0,
				marginBlockEnd: 0,
			};
			observer.notify('select-block', payload);

			expect(handler).not.toHaveBeenCalled();
		});
	});

	describe('duplicate registration', () => {
		test('should fire handler twice if the same listener is registered twice', () => {
			const observer = new ComponentObserver();
			const handler = vi.fn();

			observer.on('select-block', handler);
			observer.on('select-block', handler);

			const payload = {
				block: {} as unknown,
				width: 100,
				height: 50,
				x: 0,
				y: 0,
				marginBlockEnd: 0,
			};
			observer.notify('select-block', payload);

			expect(handler).toHaveBeenCalledTimes(2);
		});

		test('off() should remove all registered wrappers including duplicates', () => {
			const observer = new ComponentObserver();
			const handler = vi.fn();

			observer.on('select-block', handler);
			observer.on('select-block', handler);
			observer.off();

			const payload = {
				block: {} as unknown,
				width: 100,
				height: 50,
				x: 0,
				y: 0,
				marginBlockEnd: 0,
			};
			observer.notify('select-block', payload);

			expect(handler).not.toHaveBeenCalled();
		});
	});

	describe('instance isolation', () => {
		test('should not receive events from different instances', () => {
			const observer1 = new ComponentObserver();
			const observer2 = new ComponentObserver();
			const handler1 = vi.fn();
			const handler2 = vi.fn();

			observer1.on('select-block', handler1);
			observer2.on('select-block', handler2);

			const payload = {
				block: {} as unknown,
				width: 100,
				height: 50,
				x: 0,
				y: 0,
				marginBlockEnd: 0,
			};

			observer1.notify('select-block', payload);

			expect(handler1).toHaveBeenCalledWith(payload);
			expect(handler2).not.toHaveBeenCalled();
		});

		test('should isolate events across multiple instances', () => {
			const observer1 = new ComponentObserver();
			const observer2 = new ComponentObserver();
			const handler1 = vi.fn();
			const handler2 = vi.fn();

			observer1.on('file-select', handler1);
			observer2.on('file-select', handler2);

			const payload2 = { path: '/b.png', fileSize: 2048, isEmpty: false };
			observer2.notify('file-select', payload2);

			expect(handler1).not.toHaveBeenCalled();
			expect(handler2).toHaveBeenCalledWith(payload2);
		});
	});
});
