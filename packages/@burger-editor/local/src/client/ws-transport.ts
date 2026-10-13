import { browserDebugLog, browserLog } from '../helpers/browser-log.js';

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

const LOG_TAG = '[bge-agent-ws]';

/**
 * A reconnecting WebSocket client for `/ws/editor`. Deliberately knows
 * nothing about the message SHAPE (`agent-link.ts` owns that) — it only
 * moves raw text frames and manages the connection lifecycle: exponential
 * backoff with jitter between {@link MIN_BACKOFF_MS} and
 * {@link MAX_BACKOFF_MS} on unexpected close, reset to the minimum on a
 * successful open, and an escape hatch (`reconnectNow`) for
 * `bge:server-online` (the health monitor's "the dev server came back"
 * signal) to skip the wait instead of leaving a tab stuck mid-backoff for
 * up to 10s after the server is demonstrably reachable again. Every
 * connect / open / close / dropped send is logged with the `[bge-agent-ws]`
 * prefix so a stuck integration is debuggable from the browser console
 * alone; full frame payloads (`recv` / `send`) are logged only when
 * `localStorage['bge:debug'] === '1'` (see `helpers/browser-log.ts`).
 * @param options
 */
export function createWsTransport(options: WsTransportOptions): WsTransport {
	const WebSocketImpl = options.WebSocketImpl ?? globalThis.WebSocket;
	let socket: WebSocket | null = null;
	let backoffMs = MIN_BACKOFF_MS;
	let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	let disposed = false;
	/** Set by `reconnectNow()`: when the current socket's `close` fires, connect again at once instead of backing off. */
	let reconnectOnClose = false;

	/**
	 * Every listener captures its own `ws` and ignores events once `socket`
	 * has moved on to a newer instance — a late `close`/`error` from a
	 * superseded socket must not schedule a second reconnect or close the
	 * replacement.
	 */
	function connect(): void {
		if (disposed) {
			return;
		}
		browserLog(LOG_TAG, 'connecting', options.url);
		const ws = new WebSocketImpl(options.url);
		socket = ws;
		ws.addEventListener('open', () => {
			if (socket !== ws) {
				return;
			}
			browserLog(LOG_TAG, 'open');
			backoffMs = MIN_BACKOFF_MS;
			options.onOpen();
		});
		ws.addEventListener('message', (event: MessageEvent) => {
			if (socket !== ws) {
				return;
			}
			browserDebugLog(LOG_TAG, 'recv', event.data);
			if (typeof event.data === 'string') {
				options.onMessage(event.data);
			}
		});
		ws.addEventListener('close', (event: CloseEvent) => {
			if (socket !== ws) {
				return;
			}
			socket = null;
			browserLog(LOG_TAG, 'close', { code: event.code, reason: event.reason });
			if (disposed) {
				return;
			}
			if (reconnectOnClose) {
				reconnectOnClose = false;
				connect();
				return;
			}
			scheduleReconnect();
		});
		ws.addEventListener('error', () => {
			browserLog(LOG_TAG, 'error, readyState=', ws.readyState);
			// The browser follows `error` with `close` on its own; closing here
			// only shortens the wait for a socket stuck in CONNECTING.
			ws.close();
		});
	}

	/**
	 *
	 */
	function scheduleReconnect(): void {
		if (disposed || reconnectTimer) {
			return;
		}
		const jitter = Math.random() * backoffMs * 0.2;
		const delay = backoffMs + jitter;
		browserLog(LOG_TAG, `reconnecting in ${Math.round(delay)}ms`);
		reconnectTimer = setTimeout(() => {
			reconnectTimer = null;
			connect();
		}, delay);
		backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
	}

	connect();

	return {
		send(raw) {
			if (socket?.readyState === WebSocketImpl.OPEN) {
				browserDebugLog(LOG_TAG, 'send', raw);
				socket.send(raw);
				return;
			}
			browserLog(
				LOG_TAG,
				'dropped send (socket not open), readyState=',
				socket?.readyState,
				raw,
			);
		},
		reconnectNow() {
			browserLog(LOG_TAG, 'reconnectNow');
			if (disposed) {
				return;
			}
			if (reconnectTimer) {
				clearTimeout(reconnectTimer);
				reconnectTimer = null;
			}
			backoffMs = MIN_BACKOFF_MS;
			if (socket) {
				// `close` is asynchronous on a real WebSocket — let its handler do
				// the reconnect so exactly one new socket is created.
				reconnectOnClose = true;
				socket.close();
				return;
			}
			connect();
		},
		dispose() {
			browserLog(LOG_TAG, 'dispose');
			disposed = true;
			if (reconnectTimer) {
				clearTimeout(reconnectTimer);
				reconnectTimer = null;
			}
			socket?.close();
		},
	};
}
