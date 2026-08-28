import type { EditorAdapter, Transport } from './agent-link.js';
import type { UIState } from '../protocol/ws-messages.js';

import { describe, expect, test, vi } from 'vitest';

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
		applyOp: vi.fn(() => Promise.resolve({ html: '<div>applied</div>' })),
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
