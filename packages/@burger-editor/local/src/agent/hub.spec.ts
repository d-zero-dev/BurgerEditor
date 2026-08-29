import { afterEach, describe, expect, test, vi } from 'vitest';

import { createAgentHub, type AgentHub } from './hub.js';

/**
 *
 */
function fakeSocket() {
	const sent: unknown[] = [];
	return {
		sent,
		socket: {
			send: (data: string) => sent.push(JSON.parse(data)),
			close: vi.fn(),
		},
	};
}

/**
 * @param hub
 * @param socket
 * @param socket.send
 * @param socket.close
 */
function connectTab(hub: AgentHub, socket: { send(d: string): void; close(): void }) {
	const sessionId = hub.tabHub.register(socket);
	hub.tabHub.hello(sessionId, {
		page: '/a.html',
		revision: 1,
		serverSession: hub.serverSession,
		uiState: {
			openDialog: null,
			sourceMode: false,
			processing: false,
			editingBlockIndex: null,
		},
	});
	return sessionId;
}

let hub: AgentHub | undefined;

afterEach(() => {
	hub?.dispose();
	hub = undefined;
	vi.useRealTimers();
});

describe('createAgentHub', () => {
	test('returns a tabHub, a revision registry and a per-launch serverSession UUID', () => {
		hub = createAgentHub({ indexFileName: 'index.html', pingIntervalMs: 60_000 });
		expect(hub.serverSession).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
		);
		expect(hub.tabHub.snapshotAll()).toEqual([]);
		expect(hub.revisions.get('/a.html')).toBeUndefined();
		expect(hub.revisions.ensure('/a.html')).toEqual({ revision: 1, persistedHash: null });
	});

	test('two hubs never share a serverSession', () => {
		hub = createAgentHub({ pingIntervalMs: 60_000 });
		const other = createAgentHub({ pingIntervalMs: 60_000 });
		try {
			expect(other.serverSession).not.toBe(hub.serverSession);
		} finally {
			other.dispose();
		}
	});

	test('forwards indexFileName to the TabHub so a root-page hello ("/") is keyed as "/<indexFileName>"', () => {
		hub = createAgentHub({ indexFileName: 'top.html', pingIntervalMs: 60_000 });
		const { socket } = fakeSocket();
		const sessionId = hub.tabHub.register(socket);
		hub.tabHub.hello(sessionId, {
			page: '/',
			revision: 1,
			serverSession: hub.serverSession,
			uiState: {
				openDialog: null,
				sourceMode: false,
				processing: false,
				editingBlockIndex: null,
			},
		});
		expect(hub.tabHub.get(sessionId)?.page).toBe('/top.html');
	});

	test('forwards `now` to the TabHub so lastActiveAt is stamped by the injected clock', () => {
		hub = createAgentHub({ pingIntervalMs: 60_000, now: () => 1234 });
		const { socket } = fakeSocket();
		const sessionId = connectTab(hub, socket);
		expect(hub.tabHub.get(sessionId)?.lastActiveAt).toBe(1234);
	});
});

describe('AgentHub.handleSocketMessage', () => {
	test('a frame that is not JSON is dropped without throwing', () => {
		hub = createAgentHub({ pingIntervalMs: 60_000 });
		const { socket, sent } = fakeSocket();
		const sessionId = connectTab(hub, socket);
		expect(() => hub!.handleSocketMessage(sessionId, '{not json')).not.toThrow();
		expect(sent).toEqual([{ type: 'welcome', sessionId, revision: 1 }]);
	});

	test('a JSON frame that fails the schema (unknown type) is dropped without throwing', () => {
		hub = createAgentHub({ pingIntervalMs: 60_000 });
		const { socket, sent } = fakeSocket();
		const sessionId = connectTab(hub, socket);
		expect(() =>
			hub!.handleSocketMessage(
				sessionId,
				JSON.stringify({ type: 'teleport', to: 'mars' }),
			),
		).not.toThrow();
		expect(sent).toEqual([{ type: 'welcome', sessionId, revision: 1 }]);
	});

	test('a JSON frame with a known type but wrong field types is dropped without throwing', () => {
		hub = createAgentHub({ pingIntervalMs: 60_000 });
		const { socket, sent } = fakeSocket();
		const sessionId = connectTab(hub, socket);
		expect(() =>
			hub!.handleSocketMessage(
				sessionId,
				JSON.stringify({ type: 'ack', id: 'x', revision: 'two', html: 1 }),
			),
		).not.toThrow();
		expect(sent).toEqual([{ type: 'welcome', sessionId, revision: 1 }]);
	});

	test('a frame from a session that was never registered is ignored', () => {
		hub = createAgentHub({ pingIntervalMs: 60_000 });
		expect(() =>
			hub!.handleSocketMessage('ghost', JSON.stringify({ type: 'focus' })),
		).not.toThrow();
	});

	test('a `hello` frame is dispatched to TabHub.hello and answered with welcome', () => {
		hub = createAgentHub({ pingIntervalMs: 60_000 });
		const { socket, sent } = fakeSocket();
		const sessionId = hub.tabHub.register(socket);
		hub.handleSocketMessage(
			sessionId,
			JSON.stringify({
				type: 'hello',
				page: '/a.html',
				revision: 7,
				serverSession: hub.serverSession,
				uiState: {
					openDialog: null,
					sourceMode: false,
					processing: false,
					editingBlockIndex: null,
				},
			}),
		);
		expect(sent).toEqual([{ type: 'welcome', sessionId, revision: 7 }]);
		expect(hub.tabHub.get(sessionId)?.page).toBe('/a.html');
	});

	test('an `ack` frame resolves the pending apply with the acked revision and html', async () => {
		hub = createAgentHub({ pingIntervalMs: 60_000 });
		const { socket, sent } = fakeSocket();
		const sessionId = connectTab(hub, socket);
		const applyPromise = hub.tabHub.apply(
			'/a.html',
			'main',
			{ op: 'delete', index: 0 },
			1,
		);
		const apply = sent.at(-1) as { id: string };
		hub.handleSocketMessage(
			sessionId,
			JSON.stringify({ type: 'ack', id: apply.id, revision: 2, html: '<p>acked</p>' }),
		);
		await expect(applyPromise).resolves.toEqual({ revision: 2, html: '<p>acked</p>' });
	});

	test('a `nack` frame rejects the pending apply with the nack reason', async () => {
		hub = createAgentHub({ pingIntervalMs: 60_000 });
		const { socket, sent } = fakeSocket();
		const sessionId = connectTab(hub, socket);
		const applyPromise = hub.tabHub.apply(
			'/a.html',
			'main',
			{ op: 'delete', index: 0 },
			1,
		);
		const apply = sent.at(-1) as { id: string };
		hub.handleSocketMessage(
			sessionId,
			JSON.stringify({ type: 'nack', id: apply.id, reason: 'user-editing' }),
		);
		await expect(applyPromise).rejects.toThrow('Tab nacked apply: user-editing');
	});

	test('a `ui-state` frame updates the session uiState', () => {
		hub = createAgentHub({ pingIntervalMs: 60_000 });
		const { socket } = fakeSocket();
		const sessionId = connectTab(hub, socket);
		hub.handleSocketMessage(
			sessionId,
			JSON.stringify({
				type: 'ui-state',
				openDialog: 'item-editor',
				sourceMode: false,
				processing: false,
				editingBlockIndex: 3,
			}),
		);
		expect(hub.tabHub.get(sessionId)?.uiState).toEqual({
			openDialog: 'item-editor',
			sourceMode: false,
			processing: false,
			editingBlockIndex: 3,
		});
	});

	test('a `ui-state` frame always appends a `ui-state` event', () => {
		hub = createAgentHub({ pingIntervalMs: 60_000 });
		const { socket } = fakeSocket();
		const sessionId = connectTab(hub, socket);
		hub.handleSocketMessage(
			sessionId,
			JSON.stringify({
				type: 'ui-state',
				openDialog: 'item-editor',
				sourceMode: false,
				processing: false,
				editingBlockIndex: 3,
			}),
		);
		const { events } = hub.events.since(0);
		expect(events.map((e) => e.type)).toContain('ui-state');
	});

	test('a busy -> idle `ui-state` transition additionally appends a `ui-idle` event', () => {
		hub = createAgentHub({ pingIntervalMs: 60_000 });
		const { socket } = fakeSocket();
		const sessionId = connectTab(hub, socket);
		hub.handleSocketMessage(
			sessionId,
			JSON.stringify({
				type: 'ui-state',
				openDialog: 'item-editor',
				sourceMode: false,
				processing: false,
				editingBlockIndex: 3,
			}),
		);
		hub.handleSocketMessage(
			sessionId,
			JSON.stringify({
				type: 'ui-state',
				openDialog: null,
				sourceMode: false,
				processing: false,
				editingBlockIndex: null,
			}),
		);
		const { events } = hub.events.since(0);
		expect(events.filter((e) => e.type === 'ui-idle')).toHaveLength(1);
	});

	test('a `ui-state` frame for an unknown/already-disconnected sessionId appends no event', () => {
		hub = createAgentHub({ pingIntervalMs: 60_000 });
		hub.handleSocketMessage(
			'ghost',
			JSON.stringify({
				type: 'ui-state',
				openDialog: null,
				sourceMode: false,
				processing: false,
				editingBlockIndex: null,
			}),
		);
		expect(hub.events.since(0).events).toEqual([]);
	});

	test('an idle -> idle `ui-state` transition does not append a `ui-idle` event', () => {
		hub = createAgentHub({ pingIntervalMs: 60_000 });
		const { socket } = fakeSocket();
		const sessionId = connectTab(hub, socket);
		hub.handleSocketMessage(
			sessionId,
			JSON.stringify({
				type: 'ui-state',
				openDialog: null,
				sourceMode: false,
				processing: false,
				editingBlockIndex: null,
			}),
		);
		const { events } = hub.events.since(0);
		expect(events.filter((e) => e.type === 'ui-idle')).toHaveLength(0);
	});

	test('a `pong` frame touches lastActiveAt', () => {
		let now = 0;
		hub = createAgentHub({ pingIntervalMs: 60_000, now: () => now });
		const { socket } = fakeSocket();
		const sessionId = connectTab(hub, socket);
		now = 500;
		hub.handleSocketMessage(sessionId, JSON.stringify({ type: 'pong' }));
		expect(hub.tabHub.get(sessionId)?.lastActiveAt).toBe(500);
	});
});

describe('AgentHub.events', () => {
	test('an accepted `hello` appends a `session-connected` event', () => {
		hub = createAgentHub({ pingIntervalMs: 60_000 });
		const { socket } = fakeSocket();
		const sessionId = hub.tabHub.register(socket);
		hub.handleSocketMessage(
			sessionId,
			JSON.stringify({
				type: 'hello',
				page: '/a.html',
				revision: 1,
				serverSession: hub.serverSession,
				uiState: {
					openDialog: null,
					sourceMode: false,
					processing: false,
					editingBlockIndex: null,
				},
			}),
		);
		const { events } = hub.events.since(0);
		expect(events).toEqual([
			expect.objectContaining({
				type: 'session-connected',
				payload: { sessionId, page: '/a.html' },
			}),
		]);
	});

	test('a stale `hello` (mismatched serverSession) does not append a `session-connected` event', () => {
		hub = createAgentHub({ pingIntervalMs: 60_000 });
		const { socket } = fakeSocket();
		const sessionId = hub.tabHub.register(socket);
		hub.handleSocketMessage(
			sessionId,
			JSON.stringify({
				type: 'hello',
				page: '/a.html',
				revision: 1,
				serverSession: 'some-other-session',
				uiState: {
					openDialog: null,
					sourceMode: false,
					processing: false,
					editingBlockIndex: null,
				},
			}),
		);
		expect(hub.events.since(0).events).toEqual([]);
	});

	test('closeSession appends a `session-disconnected` event and forgets the tab', () => {
		hub = createAgentHub({ pingIntervalMs: 60_000 });
		const { socket } = fakeSocket();
		const sessionId = connectTab(hub, socket);

		hub.closeSession(sessionId);

		expect(hub.tabHub.get(sessionId)).toBeUndefined();
		expect(hub.events.since(0).events).toEqual([
			expect.objectContaining({
				type: 'session-disconnected',
				payload: { sessionId, page: '/a.html' },
			}),
		]);
	});

	test('closeSession on an unknown sessionId does not append an event', () => {
		hub = createAgentHub({ pingIntervalMs: 60_000 });
		expect(() => hub!.closeSession('ghost')).not.toThrow();
		expect(hub.events.since(0).events).toEqual([]);
	});
});

describe('AgentHub ping interval', () => {
	test('appends session-disconnected when a ping fails to reach a crashed/killed tab', () => {
		vi.useFakeTimers();
		hub = createAgentHub({ pingIntervalMs: 1000 });
		const socket = { send: vi.fn(() => {}), close: vi.fn() };
		const sessionId = connectTab(hub, socket);
		socket.send.mockImplementation(() => {
			throw new Error('socket closed');
		});

		vi.advanceTimersByTime(1000);

		expect(hub.tabHub.get(sessionId)).toBeUndefined();
		expect(hub.events.since(0).events).toEqual([
			expect.objectContaining({
				type: 'session-disconnected',
				payload: { sessionId, page: '/a.html' },
			}),
		]);
	});

	test('sends a ping frame to every connected tab once per pingIntervalMs', () => {
		vi.useFakeTimers();
		hub = createAgentHub({ pingIntervalMs: 1000 });
		const { socket, sent } = fakeSocket();
		const sessionId = connectTab(hub, socket);
		vi.advanceTimersByTime(1000);
		expect(sent).toEqual([{ type: 'welcome', sessionId, revision: 1 }, { type: 'ping' }]);
		vi.advanceTimersByTime(1000);
		expect(sent).toEqual([
			{ type: 'welcome', sessionId, revision: 1 },
			{ type: 'ping' },
			{ type: 'ping' },
		]);
	});

	test('dispose() stops the ping interval — no ping frame is sent after dispose', () => {
		vi.useFakeTimers();
		hub = createAgentHub({ pingIntervalMs: 1000 });
		const { socket, sent } = fakeSocket();
		const sessionId = connectTab(hub, socket);
		vi.advanceTimersByTime(1000);
		expect(sent).toEqual([{ type: 'welcome', sessionId, revision: 1 }, { type: 'ping' }]);

		hub.dispose();
		vi.advanceTimersByTime(5000);

		expect(sent).toEqual([{ type: 'welcome', sessionId, revision: 1 }, { type: 'ping' }]);
	});

	test('dispose() closes every connected socket and forgets the sessions', () => {
		vi.useFakeTimers();
		hub = createAgentHub({ pingIntervalMs: 1000 });
		const { socket } = fakeSocket();
		const sessionId = connectTab(hub, socket);

		hub.dispose();

		expect(socket.close).toHaveBeenCalledTimes(1);
		expect(hub.tabHub.get(sessionId)).toBeUndefined();
		expect(hub.tabHub.snapshotAll()).toEqual([]);
	});
});
