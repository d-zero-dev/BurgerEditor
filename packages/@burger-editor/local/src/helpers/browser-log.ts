/**
 * `console.log` doesn't timestamp its own output — DevTools has a
 * "Show timestamps" setting for that, but it's off by default and not
 * something a screenshot or copy-pasted log transcript carries with it.
 * Every Agent Hub browser log goes through this so it can be lined up
 * against server-side `DEBUG=@bge:local` output (which `debug` timestamps
 * automatically) and `/api/agent/invoke`'s `timestamp` response field
 * without needing DevTools open at the time.
 * @param tag
 * @param args
 */
export function browserLog(tag: string, ...args: unknown[]): void {
	// eslint-disable-next-line no-console
	console.log(new Date().toISOString(), tag, ...args);
}

const DEBUG_STORAGE_KEY = 'bge:debug';

/**
 * Whether verbose (per-frame) Agent Hub logging is switched on for this
 * browser: `localStorage.setItem('bge:debug', '1')`. Lifecycle events are
 * always logged; full frame payloads only under this flag, because a busy
 * session otherwise floods the console with every ping/pong and ack body.
 */
export function isBrowserDebugEnabled(): boolean {
	try {
		return globalThis.localStorage?.getItem(DEBUG_STORAGE_KEY) === '1';
	} catch {
		// Accessing localStorage throws in sandboxed / storage-blocked
		// contexts; treat that as "debug off" rather than breaking the link.
		return false;
	}
}

/**
 * `browserLog` gated by {@link isBrowserDebugEnabled}.
 * @param tag
 * @param args
 */
export function browserDebugLog(tag: string, ...args: unknown[]): void {
	if (isBrowserDebugEnabled()) {
		browserLog(tag, ...args);
	}
}
