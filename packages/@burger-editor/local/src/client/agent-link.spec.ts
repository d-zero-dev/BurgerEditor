import type { EditorAdapter, Transport } from './agent-link.js';
import type { UIState } from '../protocol/ws-messages.js';

import { afterEach, describe, expect, test, vi } from 'vitest';

import { createAgentLink } from './agent-link.js';

/**
 * @param overrides
 */
function idleUiState(overrides: Partial<UIState> = {}): UIState {
	return {
		openDialog: null,
		sourceMode: false,
		processing: false,
		editingBlockIndex: null,
		...overrides,
	};
}

/**
 * @param initialUiState
 * @param overrides
 */
function fakeAdapter(
	initialUiState: UIState = idleUiState(),
	overrides: Partial<EditorAdapter> = {},
) {
	let uiState = initialUiState;
	const listeners = new Set<() => void>();
	const adapter: EditorAdapter = {
		getUIState: () => uiState,
		// Mirrors the real adapter: `onBeforeMutate` fires right before the DOM
		// mutation, which is where the link arms its echo suppression.
		applyOp: vi.fn((_op, options) => {
			options.onBeforeMutate();
			return Promise.resolve({ html: '<div>applied</div>' });
		}),
		reload: vi.fn(),
		subscribeUIState: (listener) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		...overrides,
	};
	return {
		adapter,
		setUiState(next: UIState) {
			uiState = next;
			for (const listener of listeners) listener();
		},
	};
}

/**
 *
 */
function fakeTransport() {
	const sent: unknown[] = [];
	const transport: Transport = { send: (raw) => sent.push(JSON.parse(raw)) };
	return { transport, sent };
}

describe('createAgentLink — handleMessage', () => {
	test('ignores malformed JSON and unrecognized message shapes', () => {
		const { adapter } = fakeAdapter();
		const { transport, sent } = fakeTransport();
		const link = createAgentLink({
			adapter,
			transport,
			page: '/a.html',
			serverSession: 's',
		});

		link.handleMessage('not json');
		link.handleMessage(JSON.stringify({ type: 'not-a-real-type' }));

		expect(sent).toEqual([]);
	});

	test('responds to ping with pong', () => {
		const { adapter } = fakeAdapter();
		const { transport, sent } = fakeTransport();
		const link = createAgentLink({
			adapter,
			transport,
			page: '/a.html',
			serverSession: 's',
		});

		link.handleMessage(JSON.stringify({ type: 'ping' }));

		expect(sent).toEqual([{ type: 'pong' }]);
	});

	test('a busy tab (dialog open) nacks apply as user-editing with its editingBlockIndex', async () => {
		const { adapter } = fakeAdapter(
			idleUiState({ openDialog: 'item-editor', editingBlockIndex: 2 }),
		);
		const { transport, sent } = fakeTransport();
		const link = createAgentLink({
			adapter,
			transport,
			page: '/a.html',
			serverSession: 's',
		});

		link.handleMessage(
			JSON.stringify({
				type: 'apply',
				id: 'op-1',
				area: 'main',
				op: { op: 'delete', index: 0 },
				baseRevision: 1,
				revision: 2,
				highlight: true,
			}),
		);
		await Promise.resolve();

		expect(sent).toEqual([
			{
				type: 'nack',
				id: 'op-1',
				reason: 'user-editing',
				detail: { editingBlockIndex: 2 },
			},
		]);
		expect(adapter.applyOp).not.toHaveBeenCalled();
	});

	test('an idle tab applies the op and acks with the resulting html', async () => {
		const { adapter } = fakeAdapter();
		const { transport, sent } = fakeTransport();
		const link = createAgentLink({
			adapter,
			transport,
			page: '/a.html',
			serverSession: 's',
		});

		link.handleMessage(
			JSON.stringify({
				type: 'apply',
				id: 'op-1',
				area: 'main',
				op: { op: 'delete', index: 0 },
				baseRevision: 1,
				revision: 2,
				highlight: true,
			}),
		);
		await Promise.resolve();
		await Promise.resolve();

		expect(sent).toEqual([
			{ type: 'ack', id: 'op-1', revision: 2, html: '<div>applied</div>' },
		]);
	});

	test('consumeEcho returns true exactly once after an applied op', async () => {
		const { adapter } = fakeAdapter();
		const { transport } = fakeTransport();
		const link = createAgentLink({
			adapter,
			transport,
			page: '/a.html',
			serverSession: 's',
		});

		expect(link.consumeEcho()).toBe(false);

		link.handleMessage(
			JSON.stringify({
				type: 'apply',
				id: 'op-1',
				area: 'main',
				op: { op: 'delete', index: 0 },
				baseRevision: 1,
				revision: 2,
				highlight: true,
			}),
		);
		await Promise.resolve();
		await Promise.resolve();

		expect(link.consumeEcho()).toBe(true);
		expect(link.consumeEcho()).toBe(false);
	});

	test('a nacked applyOp failure (RangeError) surfaces as a range nack, not an echo', async () => {
		const { adapter } = fakeAdapter(idleUiState(), {
			applyOp: vi.fn(() => Promise.reject(new RangeError('out of range'))),
		});
		const { transport, sent } = fakeTransport();
		const link = createAgentLink({
			adapter,
			transport,
			page: '/a.html',
			serverSession: 's',
		});

		link.handleMessage(
			JSON.stringify({
				type: 'apply',
				id: 'op-1',
				area: 'main',
				op: { op: 'delete', index: 99 },
				baseRevision: 1,
				revision: 2,
				highlight: true,
			}),
		);
		await Promise.resolve();
		await Promise.resolve();

		expect(sent).toEqual([
			{ type: 'nack', id: 'op-1', reason: 'range', detail: 'out of range' },
		]);
		expect(link.consumeEcho()).toBe(false);
	});

	test('reload is deferred until the tab becomes idle', () => {
		const { adapter, setUiState } = fakeAdapter(idleUiState({ sourceMode: true }));
		const { transport } = fakeTransport();
		const link = createAgentLink({
			adapter,
			transport,
			page: '/a.html',
			serverSession: 's',
		});

		link.handleMessage(JSON.stringify({ type: 'reload', revision: 3, reason: 'behind' }));
		expect(adapter.reload).not.toHaveBeenCalled();

		setUiState(idleUiState());
		expect(adapter.reload).toHaveBeenCalledTimes(1);
	});
});

describe('createAgentLink — outbound', () => {
	test('handleOpen sends hello with the current ui state', () => {
		const { adapter } = fakeAdapter(idleUiState({ processing: true }));
		const { transport, sent } = fakeTransport();
		const link = createAgentLink({
			adapter,
			transport,
			page: '/a.html',
			serverSession: 'srv-1',
		});

		link.handleOpen();

		expect(sent).toEqual([
			{
				type: 'hello',
				page: '/a.html',
				revision: 0,
				serverSession: 'srv-1',
				uiState: idleUiState({ processing: true }),
			},
		]);
	});

	test('a UI state change is pushed as a ui-state message', () => {
		const { adapter, setUiState } = fakeAdapter();
		const { transport, sent } = fakeTransport();
		createAgentLink({ adapter, transport, page: '/a.html', serverSession: 's' });

		setUiState(idleUiState({ processing: true }));

		expect(sent).toEqual([{ type: 'ui-state', ...idleUiState({ processing: true }) }]);
	});

	test('notifyHumanSave sends a saved message with the last known revision', () => {
		const { adapter } = fakeAdapter();
		const { transport, sent } = fakeTransport();
		const link = createAgentLink({
			adapter,
			transport,
			page: '/a.html',
			serverSession: 's',
		});

		link.handleMessage(JSON.stringify({ type: 'welcome', sessionId: 'x', revision: 5 }));
		link.notifyHumanSave();

		expect(sent).toEqual([{ type: 'saved', revision: 5 }]);
	});

	test('notifyHumanSave is a no-op after dispose', () => {
		const { adapter } = fakeAdapter();
		const { transport, sent } = fakeTransport();
		const link = createAgentLink({
			adapter,
			transport,
			page: '/a.html',
			serverSession: 's',
		});

		link.dispose();
		link.notifyHumanSave();

		expect(sent).toEqual([]);
	});
});

/**
 * @param op
 */
function applyFrame(op?: unknown): string {
	return JSON.stringify({
		type: 'apply',
		id: 'op-1',
		area: 'main',
		op: op ?? { op: 'delete', index: 0 },
		baseRevision: 1,
		revision: 2,
		highlight: true,
	});
}

describe('createAgentLink — echo suppression timing', () => {
	test('consumeEcho stays false while applyOp is still pending and only becomes true once onBeforeMutate has fired', async () => {
		let capturedOnBeforeMutate: (() => void) | null = null;
		let resolveApply: ((result: { html: string }) => void) | null = null;
		const { adapter } = fakeAdapter(idleUiState(), {
			applyOp: vi.fn((_op, options) => {
				capturedOnBeforeMutate = options.onBeforeMutate;
				return new Promise<{ html: string }>((resolve) => {
					resolveApply = resolve;
				});
			}),
		});
		const { transport, sent } = fakeTransport();
		const link = createAgentLink({
			adapter,
			transport,
			page: '/a.html',
			serverSession: 's',
		});

		link.handleMessage(applyFrame());
		await Promise.resolve();
		await Promise.resolve();

		expect(adapter.applyOp).toHaveBeenCalledTimes(1);
		// A human save landing during the highlight animation must not be swallowed.
		expect(link.consumeEcho()).toBe(false);

		capturedOnBeforeMutate!();
		resolveApply!({ html: '<div>applied</div>' });
		await Promise.resolve();
		await Promise.resolve();

		expect(link.consumeEcho()).toBe(true);
		expect(link.consumeEcho()).toBe(false);
		expect(sent).toEqual([
			{ type: 'ack', id: 'op-1', revision: 2, html: '<div>applied</div>' },
		]);
	});
});

describe('createAgentLink — nack reason classification', () => {
	test('an error named RangeError that is not an instanceof RangeError (cross-realm) nacks as range', async () => {
		const crossRealmError = Object.assign(new Error('index 99 out of range'), {
			name: 'RangeError',
		});
		expect(crossRealmError instanceof RangeError).toBe(false);
		const { adapter } = fakeAdapter(idleUiState(), {
			applyOp: vi.fn(() => Promise.reject(crossRealmError)),
		});
		const { transport, sent } = fakeTransport();
		const link = createAgentLink({
			adapter,
			transport,
			page: '/a.html',
			serverSession: 's',
		});

		link.handleMessage(applyFrame({ op: 'delete', index: 99 }));
		await Promise.resolve();
		await Promise.resolve();

		expect(sent).toEqual([
			{ type: 'nack', id: 'op-1', reason: 'range', detail: 'index 99 out of range' },
		]);
	});

	test('an error with any other name nacks as disabled-block with its message as detail', async () => {
		const disabledError = Object.assign(new Error('The image item is disabled'), {
			name: 'DisabledBlockError',
		});
		const { adapter } = fakeAdapter(idleUiState(), {
			applyOp: vi.fn(() => Promise.reject(disabledError)),
		});
		const { transport, sent } = fakeTransport();
		const link = createAgentLink({
			adapter,
			transport,
			page: '/a.html',
			serverSession: 's',
		});

		link.handleMessage(applyFrame({ op: 'insert', index: 0, blockHtml: '<div></div>' }));
		await Promise.resolve();
		await Promise.resolve();

		expect(sent).toEqual([
			{
				type: 'nack',
				id: 'op-1',
				reason: 'disabled-block',
				detail: 'The image item is disabled',
			},
		]);
	});
});

describe('createAgentLink — dispose', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	test('dispose while waiting for processing to clear cancels the timeout (no nack after 3000ms) and unsubscribes', async () => {
		vi.useFakeTimers();
		const unsubscribe = vi.fn();
		const subscribeUIState = vi.fn(() => unsubscribe);
		const { adapter } = fakeAdapter(idleUiState({ processing: true }), {
			subscribeUIState,
		});
		const { transport, sent } = fakeTransport();
		const link = createAgentLink({
			adapter,
			transport,
			page: '/a.html',
			serverSession: 's',
		});

		link.handleMessage(applyFrame());
		await Promise.resolve();
		// One subscription from construction (ui-state push), one from waitUntilNotProcessing.
		expect(subscribeUIState).toHaveBeenCalledTimes(2);

		link.dispose();
		expect(unsubscribe).toHaveBeenCalledTimes(2);

		vi.advanceTimersByTime(3000);
		await Promise.resolve();
		await Promise.resolve();

		expect(sent).toEqual([]);
		expect(adapter.applyOp).not.toHaveBeenCalled();
	});

	test('dispose while a reload is waiting for idle unsubscribes and never reloads even once the tab becomes idle', () => {
		const listeners = new Set<() => void>();
		const unsubscribe = vi.fn();
		let uiState = idleUiState({ sourceMode: true });
		const adapter: EditorAdapter = {
			getUIState: () => uiState,
			applyOp: vi.fn(() => Promise.resolve({ html: '' })),
			reload: vi.fn(),
			subscribeUIState: vi.fn((listener: () => void) => {
				listeners.add(listener);
				return () => {
					unsubscribe();
					listeners.delete(listener);
				};
			}),
		};
		const { transport } = fakeTransport();
		const link = createAgentLink({
			adapter,
			transport,
			page: '/a.html',
			serverSession: 's',
		});

		link.handleMessage(JSON.stringify({ type: 'reload', revision: 3, reason: 'behind' }));
		expect(adapter.reload).not.toHaveBeenCalled();
		// One subscription from construction (ui-state push), one from reloadWhenIdle.
		expect(adapter.subscribeUIState).toHaveBeenCalledTimes(2);

		link.dispose();
		expect(unsubscribe).toHaveBeenCalledTimes(2);
		expect(listeners.size).toBe(0);

		uiState = idleUiState();
		for (const listener of listeners) listener();

		expect(adapter.reload).not.toHaveBeenCalled();
	});

	test('an apply frame received after dispose does not call applyOp', async () => {
		const { adapter } = fakeAdapter();
		const { transport, sent } = fakeTransport();
		const link = createAgentLink({
			adapter,
			transport,
			page: '/a.html',
			serverSession: 's',
		});

		link.dispose();
		link.handleMessage(applyFrame());
		await Promise.resolve();
		await Promise.resolve();

		expect(adapter.applyOp).not.toHaveBeenCalled();
		expect(sent).toEqual([]);
	});
});
