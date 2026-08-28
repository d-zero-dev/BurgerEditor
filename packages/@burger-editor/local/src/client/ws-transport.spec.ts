import { afterEach, describe, expect, test, vi } from 'vitest';

import { createWsTransport } from './ws-transport.js';

class FakeSocket {
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
		this.readyState = FakeSocket.CLOSED;
		this.#emit('close', { code: 1000, reason: '' });
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

afterEach(() => {
	FakeSocket.instances = [];
	vi.useRealTimers();
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
});
