import type { MiddlewareHandler } from 'hono';

const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/**
 * @param hostHeader value of a `Host` or `Origin` header (with or without a scheme/port)
 */
function extractHostname(hostHeader: string): string {
	try {
		// `Origin` is a full URL; `Host` is bare `hostname[:port]`. Prefixing
		// with a scheme lets `URL` parse both the same way.
		const url = new URL(hostHeader.includes('://') ? hostHeader : `http://${hostHeader}`);
		return url.hostname;
	} catch {
		return hostHeader;
	}
}

/** Bind addresses that mean "every interface" — a client never sends these as `Host`. */
const WILDCARD_BINDS = new Set(['0.0.0.0', '::', '[::]']);

/**
 * Reject requests whose `Host` (and, when present, `Origin`) header isn't
 * `localhost` / a loopback address / the configured `host`. Stops DNS
 * rebinding: a page served from an attacker-controlled domain can't make the
 * victim's browser issue same-origin-looking requests to this server just
 * because the browser resolved that domain to 127.0.0.1, because the `Host`
 * header still carries the attacker's domain name, not an allow-listed one.
 *
 * A wildcard bind (`0.0.0.0` / `::`) can't be allow-listed by literal: the
 * server is reachable under every interface address, and no client ever puts
 * the wildcard itself in `Host`. In that mode the `Host` check is skipped —
 * access is gated by the per-launch token `auth.ts` requires for any
 * non-loopback bind instead — but `Origin`, when a browser sends one, must
 * still name the same host the request was addressed to, which is what
 * actually defeats a rebinding page (its `Origin` is the attacker's domain).
 * @param configuredHost the `host` this server was configured to bind/serve as (e.g. a LAN IP)
 */
export function hostGuard(configuredHost: string): MiddlewareHandler {
	const wildcard = WILDCARD_BINDS.has(configuredHost);
	const allowed = new Set([...LOOPBACK_HOSTNAMES, configuredHost]);
	return async (c, next) => {
		const hostHeader = c.req.header('host');
		if (!hostHeader) {
			return c.text('Forbidden: untrusted Host header', 403);
		}
		const hostname = extractHostname(hostHeader);
		if (!wildcard && !allowed.has(hostname)) {
			return c.text('Forbidden: untrusted Host header', 403);
		}
		const origin = c.req.header('origin');
		if (origin) {
			const originHost = extractHostname(origin);
			const originOk = wildcard ? originHost === hostname : allowed.has(originHost);
			if (!originOk) {
				return c.text('Forbidden: untrusted Origin header', 403);
			}
		}
		return await next();
	};
}
