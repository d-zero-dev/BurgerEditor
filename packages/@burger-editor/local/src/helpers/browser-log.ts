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
