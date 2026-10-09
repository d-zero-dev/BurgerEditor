// Deliberately free of `node:*` imports: `create-health-checker.ts` (a
// published entry point that may run in a browser) uses `toUrlHost` too.

/**
 * `host` as it must appear in a URL authority: an IPv6 literal (anything
 * containing `:`, the same test Vite uses) is wrapped in brackets
 * (`::1` → `[::1]`, a zone ID's `%` escaped as `%25`); anything else is
 * returned unchanged. `http://${host}:${port}` without this yields
 * `http://::1:5255`, which no URL parser or browser accepts.
 * @param host the configured `host`
 */
export function toUrlHost(host: string): string {
	if (!host.includes(':') || host.startsWith('[')) {
		return host;
	}
	return `[${host.replace('%', '%25')}]`;
}

/**
 * `host` in the canonical form `URL#hostname` gives it — lowercase, IPv6
 * bracketed and shortened (`2001:DB8:0:0::1` → `[2001:db8::1]`), IPv4
 * shorthand expanded (`0` → `0.0.0.0`) — or `null` when it can't be part of
 * a URL at all (e.g. an IPv6 zone ID, which the URL parser rejects). Comparing
 * canonical forms is what lets a configured host match the `Host` /
 * `Origin` a browser actually sends, however the config spelled it.
 * @param host the configured `host`
 */
export function canonicalHostname(host: string): string | null {
	try {
		return new URL(`http://${toUrlHost(host)}`).hostname;
	} catch {
		return null;
	}
}

const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * Whether `host` names this machine's loopback interface, in any spelling
 * (`::1`, `0:0:0:0:0:0:0:1`, …).
 * @param host a configured `host` or a hostname taken from a request header
 */
export function isLoopbackHost(host: string): boolean {
	return LOOPBACK_HOSTNAMES.has(canonicalHostname(host) ?? host);
}

// `[::ffff:0:0]` is `::ffff:0.0.0.0`, the IPv4-mapped spelling of 0.0.0.0.
const WILDCARD_HOSTNAMES = new Set(['0.0.0.0', '[::]', '[::ffff:0:0]']);

/**
 * Thrown when `host` is a wildcard address (`0.0.0.0` / `::`). The server
 * prints and opens `http://<host>:<port>` — the browser URL, the banner's
 * Location and the token login link are all built from `host` — so `host`
 * must be an address a browser can actually connect to.
 */
export class WildcardHostError extends Error {
	constructor(host: string) {
		const browserReason =
			canonicalHostname(host) === '0.0.0.0'
				? 'Chrome and Safari block requests to 0.0.0.0.'
				: `"${host}" (the IPv6 "any" address) is not an address a browser can connect to.`;
		super(
			`Invalid host "${host}" in the BurgerEditor config.\n` +
				`"${host}" tells the server to listen on every network interface, but it is not an address anyone can connect to. ` +
				`BurgerEditor opens and prints http://<host>:<port> as the editor URL (browser launch, startup banner, token login link), ` +
				`and that URL cannot be opened: ${browserReason}\n` +
				`Set host to "localhost" to use the editor on this machine, or to this machine's LAN IP address to also open it from other devices on the network.`,
		);
		this.name = 'WildcardHostError';
	}
}

/**
 * Reject a wildcard `host` — `0.0.0.0`, `::` and every other spelling of
 * them (`0`, `0:0:0:0:0:0:0:0`, `::ffff:0.0.0.0`, …) — with a
 * {@link WildcardHostError} explaining why.
 * @param host the configured `host`
 * @throws {WildcardHostError}
 */
export function assertConnectableHost(host: string): void {
	if (WILDCARD_HOSTNAMES.has(canonicalHostname(host) ?? '')) {
		throw new WildcardHostError(host);
	}
}
