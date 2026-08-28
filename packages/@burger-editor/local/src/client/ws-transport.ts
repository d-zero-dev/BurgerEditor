const MIN_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 10_000;

export interface WsTransportOptions {
	readonly url: string;
	readonly onMessage: (raw: string) => void;
	readonly onOpen: () => void;
	/** Injectable for tests — defaults to the global `WebSocket`. */
	readonly WebSocketImpl?: typeof WebSocket;
}

export interface WsTransport {
	send(raw: string): void;
	/** Force an immediate reconnect attempt, resetting the backoff — call on `bge:server-online`. */
	reconnectNow(): void;
	dispose(): void;
}

/**
 * A reconnecting WebSocket client for `/ws/editor`. Deliberately knows
 * nothing about the message SHAPE (`agent-link.ts` owns that) — it only
 * moves raw text frames and manages the connection lifecycle: exponential
 * backoff with jitter between {@link MIN_BACKOFF_MS} and
 * {@link MAX_BACKOFF_MS} on unexpected close, reset to the minimum on a
 * successful open, and an escape hatch (`reconnectNow`) for
 * `bge:server-online` (the health monitor's "the dev server came back"
 * signal) to skip the wait instead of leaving a tab stuck mid-backoff for
 * up to 10s after the server is demonstrably reachable again.
 * @param options
 */
export function createWsTransport(options: WsTransportOptions): WsTransport {
	const WebSocketImpl = options.WebSocketImpl ?? globalThis.WebSocket;
	let socket: WebSocket | null = null;
	let backoffMs = MIN_BACKOFF_MS;
	let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	let disposed = false;

	/**
	 *
	 */
	function connect(): void {
		if (disposed) {
			return;
		}
		socket = new WebSocketImpl(options.url);
		socket.addEventListener('open', () => {
			backoffMs = MIN_BACKOFF_MS;
			options.onOpen();
		});
		socket.addEventListener('message', (event: MessageEvent) => {
			if (typeof event.data === 'string') {
				options.onMessage(event.data);
			}
		});
		socket.addEventListener('close', scheduleReconnect);
		socket.addEventListener('error', () => socket?.close());
	}

	/**
	 *
	 */
	function scheduleReconnect(): void {
		if (disposed || reconnectTimer) {
			return;
		}
		const jitter = Math.random() * backoffMs * 0.2;
		reconnectTimer = setTimeout(() => {
			reconnectTimer = null;
			connect();
		}, backoffMs + jitter);
		backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
	}

	connect();

	return {
		send(raw) {
			if (socket?.readyState === WebSocketImpl.OPEN) {
				socket.send(raw);
			}
		},
		reconnectNow() {
			if (reconnectTimer) {
				clearTimeout(reconnectTimer);
				reconnectTimer = null;
			}
			backoffMs = MIN_BACKOFF_MS;
			socket?.close();
			if (!socket || socket.readyState === WebSocketImpl.CLOSED) {
				connect();
			}
		},
		dispose() {
			disposed = true;
			if (reconnectTimer) {
				clearTimeout(reconnectTimer);
			}
			socket?.close();
		},
	};
}
