import { afterEach, describe, expect, test, vi } from 'vitest';

import { createWsTransport } from './ws-transport.js';

class FakeSocket {
	closeCalls = 0;
	readyState = 0;
	sent: string[] = [];
	url: string;
	#listeners = new Map<string, ((event?: unknown) => void)[]>();
	constructor(url: string) {
		this.url = url;
		FakeSocket.instances.push(this);
	}
	addEventListener(type: string, listener: (event?: unknown) => void) {
		const list = this.#listeners.get(type) ?? [];
		list.push(listener);
		this.#listeners.set(type, list);
	}

	close() {
		this.closeCalls += 1;
		this.readyState = FakeSocket.CLOSED;
		this.#emit('close', { code: 1000, reason: '' });
	}
	error() {
		this.#emit('error');
	}
	message(data: string) {
		this.#emit('message', { data });
	}
	open() {
		this.readyState = FakeSocket.OPEN;
		this.#emit('open');
	}
	send(data: string) {
		this.sent.push(data);
	}
	#emit(type: string, event?: unknown) {
		for (const listener of this.#listeners.get(type) ?? []) {
			listener(event);
		}
	}
	static instances: FakeSocket[] = [];
	static readonly OPEN = 1;
	static readonly CLOSED = 3;
}

/**
 * jsdom under vitest leaves `localStorage` undefined (Node's own
 * `localStorage` getter shadows it), so the debug flag is exercised through
 * a minimal in-memory `Storage` stub instead.
 */
function stubLocalStorage(): Map<string, string> {
	const store = new Map<string, string>();
	vi.stubGlobal('localStorage', {
		getItem: (key: string) => store.get(key) ?? null,
		setItem: (key: string, value: string) => store.set(key, value),
		removeItem: (key: string) => store.delete(key),
	});
	return store;
}

afterEach(() => {
	FakeSocket.instances = [];
	vi.useRealTimers();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe('createWsTransport', () => {
	test('connects immediately and calls onOpen once the socket opens', () => {
		const onOpen = vi.fn();
		createWsTransport({
			url: 'ws://x',
			onMessage: () => {},
			onOpen,
			WebSocketImpl: FakeSocket as unknown as typeof WebSocket,
		});
		expect(FakeSocket.instances).toHaveLength(1);
		FakeSocket.instances[0]!.open();
		expect(onOpen).toHaveBeenCalledTimes(1);
	});

	test('forwards string messages to onMessage', () => {
		const onMessage = vi.fn();
		createWsTransport({
			url: 'ws://x',
			onMessage,
			onOpen: () => {},
			WebSocketImpl: FakeSocket as unknown as typeof WebSocket,
		});
		FakeSocket.instances[0]!.message('hello');
		expect(onMessage).toHaveBeenCalledWith('hello');
	});

	test('send only writes to an OPEN socket', () => {
		const transport = createWsTransport({
			url: 'ws://x',
			onMessage: () => {},
			onOpen: () => {},
			WebSocketImpl: FakeSocket as unknown as typeof WebSocket,
		});
		transport.send('too-early');
		expect(FakeSocket.instances[0]!.sent).toEqual([]);

		FakeSocket.instances[0]!.open();
		transport.send('now');
		expect(FakeSocket.instances[0]!.sent).toEqual(['now']);
	});

	test('reconnects with exponential backoff after an unexpected close', () => {
		vi.useFakeTimers();
		createWsTransport({
			url: 'ws://x',
			onMessage: () => {},
			onOpen: () => {},
			WebSocketImpl: FakeSocket as unknown as typeof WebSocket,
		});
		FakeSocket.instances[0]!.close();
		expect(FakeSocket.instances).toHaveLength(1);

		vi.advanceTimersByTime(700); // > 500ms min backoff + jitter margin
		expect(FakeSocket.instances).toHaveLength(2);

		FakeSocket.instances[1]!.close();
		vi.advanceTimersByTime(700); // still within the doubled ~1000ms window
		expect(FakeSocket.instances).toHaveLength(2);

		vi.advanceTimersByTime(600);
		expect(FakeSocket.instances).toHaveLength(3);
	});

	test('a successful open resets the backoff to the minimum', () => {
		vi.useFakeTimers();
		createWsTransport({
			url: 'ws://x',
			onMessage: () => {},
			onOpen: () => {},
			WebSocketImpl: FakeSocket as unknown as typeof WebSocket,
		});
		FakeSocket.instances[0]!.close();
		vi.advanceTimersByTime(700);
		FakeSocket.instances[1]!.open();
		FakeSocket.instances[1]!.close();

		vi.advanceTimersByTime(700); // back to the ~500ms window, not ~1000ms
		expect(FakeSocket.instances).toHaveLength(3);
	});

	test('reconnectNow closes the current socket and connects again without waiting', () => {
		const transport = createWsTransport({
			url: 'ws://x',
			onMessage: () => {},
			onOpen: () => {},
			WebSocketImpl: FakeSocket as unknown as typeof WebSocket,
		});
		FakeSocket.instances[0]!.open();
		transport.reconnectNow();
		expect(FakeSocket.instances).toHaveLength(2);
	});

	test('dispose closes the socket and stops reconnecting', () => {
		vi.useFakeTimers();
		const transport = createWsTransport({
			url: 'ws://x',
			onMessage: () => {},
			onOpen: () => {},
			WebSocketImpl: FakeSocket as unknown as typeof WebSocket,
		});
		transport.dispose();
		FakeSocket.instances[0]!.close();
		vi.advanceTimersByTime(20_000);
		expect(FakeSocket.instances).toHaveLength(1);
	});

	test('reconnectNow on an OPEN socket creates exactly one new socket, and no further socket appears after 20s', () => {
		vi.useFakeTimers();
		const transport = createWsTransport({
			url: 'ws://x',
			onMessage: () => {},
			onOpen: () => {},
			WebSocketImpl: FakeSocket as unknown as typeof WebSocket,
		});
		FakeSocket.instances[0]!.open();

		transport.reconnectNow();
		expect(FakeSocket.instances).toHaveLength(2);

		vi.advanceTimersByTime(20_000);
		expect(FakeSocket.instances).toHaveLength(2);
	});

	test('a close event from a superseded socket does not schedule a reconnect', () => {
		vi.useFakeTimers();
		const transport = createWsTransport({
			url: 'ws://x',
			onMessage: () => {},
			onOpen: () => {},
			WebSocketImpl: FakeSocket as unknown as typeof WebSocket,
		});
		const oldSocket = FakeSocket.instances[0]!;
		oldSocket.open();
		transport.reconnectNow();
		expect(FakeSocket.instances).toHaveLength(2);

		oldSocket.close();
		vi.advanceTimersByTime(20_000);

		expect(FakeSocket.instances).toHaveLength(2);
	});

	test('an error event closes only the socket it came from, not the replacement', () => {
		const transport = createWsTransport({
			url: 'ws://x',
			onMessage: () => {},
			onOpen: () => {},
			WebSocketImpl: FakeSocket as unknown as typeof WebSocket,
		});
		const oldSocket = FakeSocket.instances[0]!;
		oldSocket.open();
		transport.reconnectNow();
		const newSocket = FakeSocket.instances[1]!;
		expect(oldSocket.closeCalls).toBe(1);
		expect(newSocket.closeCalls).toBe(0);

		oldSocket.error();

		expect(oldSocket.closeCalls).toBe(2);
		expect(newSocket.closeCalls).toBe(0);
		expect(FakeSocket.instances).toHaveLength(2);
	});
});

describe('createWsTransport — logging', () => {
	/**
	 * @param logSpy
	 * @param marker
	 */
	function callsIncluding(logSpy: ReturnType<typeof vi.spyOn>, marker: string) {
		return logSpy.mock.calls.filter((args) => args.includes(marker));
	}

	test('without the bge:debug flag, an inbound frame is not logged as recv while open is still logged', () => {
		stubLocalStorage();
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
		createWsTransport({
			url: 'ws://x',
			onMessage: () => {},
			onOpen: () => {},
			WebSocketImpl: FakeSocket as unknown as typeof WebSocket,
		});
		FakeSocket.instances[0]!.open();
		FakeSocket.instances[0]!.message('{"type":"ping"}');

		expect(callsIncluding(logSpy, 'recv')).toHaveLength(0);
		expect(callsIncluding(logSpy, 'open')).toHaveLength(1);
	});

	test('with localStorage bge:debug=1, inbound and outbound frames are logged as recv / send', () => {
		stubLocalStorage().set('bge:debug', '1');
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
		const transport = createWsTransport({
			url: 'ws://x',
			onMessage: () => {},
			onOpen: () => {},
			WebSocketImpl: FakeSocket as unknown as typeof WebSocket,
		});
		FakeSocket.instances[0]!.open();
		FakeSocket.instances[0]!.message('{"type":"ping"}');
		transport.send('{"type":"pong"}');

		expect(callsIncluding(logSpy, 'recv')).toHaveLength(1);
		expect(callsIncluding(logSpy, 'recv')[0]).toContain('{"type":"ping"}');
		expect(callsIncluding(logSpy, 'send')).toHaveLength(1);
		expect(callsIncluding(logSpy, 'send')[0]).toContain('{"type":"pong"}');
		expect(callsIncluding(logSpy, 'open')).toHaveLength(1);
	});

	test('without the bge:debug flag, an outbound frame is not logged as send', () => {
		stubLocalStorage();
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
		const transport = createWsTransport({
			url: 'ws://x',
			onMessage: () => {},
			onOpen: () => {},
			WebSocketImpl: FakeSocket as unknown as typeof WebSocket,
		});
		FakeSocket.instances[0]!.open();
		transport.send('{"type":"pong"}');

		expect(callsIncluding(logSpy, 'send')).toHaveLength(0);
	});
});
