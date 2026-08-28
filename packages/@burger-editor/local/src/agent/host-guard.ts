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

/**
 * Reject requests whose `Host` (and, when present, `Origin`) header isn't
 * `localhost` / a loopback address / the configured `host`. Stops DNS
 * rebinding: a page served from an attacker-controlled domain can't make the
 * victim's browser issue same-origin-looking requests to this server just
 * because the browser resolved that domain to 127.0.0.1, because the `Host`
 * header still carries the attacker's domain name, not an allow-listed one.
 * @param configuredHost the `host` this server was configured to bind/serve as (e.g. a LAN IP)
 */
export function hostGuard(configuredHost: string): MiddlewareHandler {
	const allowed = new Set([...LOOPBACK_HOSTNAMES, configuredHost]);
	return async (c, next) => {
		const hostHeader = c.req.header('host');
		if (!hostHeader || !allowed.has(extractHostname(hostHeader))) {
			return c.text('Forbidden: untrusted Host header', 403);
		}
		const origin = c.req.header('origin');
		if (origin && !allowed.has(extractHostname(origin))) {
			return c.text('Forbidden: untrusted Origin header', 403);
		}
		return await next();
	};
}
