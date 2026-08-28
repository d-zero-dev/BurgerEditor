import { randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export const AGENT_SESSION_COOKIE = 'bge_session';

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

export interface AgentAuth {
	/** `false` when bound to a loopback address — every route is open, no token exists. */
	readonly required: boolean;
	/** The per-launch token, for building the banner's `?token=` URL. `null` when `required` is `false`. */
	readonly token: string | null;
	/** Absolute path the token was written to, so the caller can delete it on shutdown. `null` when `required` is `false`. */
	readonly tokenFilePath: string | null;
	/**
	 * @param cookieValue value of the `bge_session` cookie, if any
	 * @param bearerValue the bearer token from `Authorization: Bearer <token>`, if any
	 */
	verify(cookieValue?: string, bearerValue?: string): boolean;
}

/**
 * Bound to a non-loopback address (a LAN IP, `0.0.0.0`, …), anyone who can
 * reach the port can open the editor UI — unlike loopback, where reaching
 * the port already implies running code on the same machine (which can read
 * `documentRoot` directly, making a token pointless). This mints a
 * per-launch token, persists it to `<configDir>/.burgereditor/agent-token`
 * (0600) for `mcp-server` to read, and hands back a `verify` a route
 * middleware can call against the `bge_session` cookie (browser) or
 * `Authorization: Bearer` header (MCP).
 *
 * The caller is responsible for deleting `tokenFilePath` on shutdown and
 * reminding the user to `.gitignore` `.burgereditor/`.
 * @param host the configured bind/serve host
 * @param configDir directory to persist the token file under (`getUserConfig()`'s `configDir`)
 */
export async function createAgentAuth(
	host: string,
	configDir: string,
): Promise<AgentAuth> {
	if (LOOPBACK_HOSTS.has(host)) {
		return { required: false, token: null, tokenFilePath: null, verify: () => true };
	}

	const token = randomBytes(24).toString('hex');
	const tokenDir = path.join(configDir, '.burgereditor');
	await fs.mkdir(tokenDir, { recursive: true });
	const tokenFilePath = path.join(tokenDir, 'agent-token');
	await fs.writeFile(tokenFilePath, token, { mode: 0o600 });

	return {
		required: true,
		token,
		tokenFilePath,
		verify(cookieValue, bearerValue) {
			return cookieValue === token || bearerValue === token;
		},
	};
}

/**
 * @param location the base URL the server printed in its banner
 * @param auth
 */
export function loginUrl(location: string, auth: AgentAuth): string | null {
	if (!auth.required || !auth.token) {
		return null;
	}
	return `${location}/?token=${auth.token}`;
}

/**
 * Shared by the `/api/agent/*` routes and the `/ws/editor` upgrade — both
 * need the same cookie-or-bearer check against a plain header reader, so it
 * doesn't matter whether the caller is a Hono `Context` or an upgrade
 * handler's raw request.
 * @param auth
 * @param headers
 * @param headers.header
 */
export function isAgentAuthed(
	auth: AgentAuth,
	headers: { header(name: string): string | undefined },
): boolean {
	if (!auth.required) {
		return true;
	}
	const cookieHeader = headers.header('cookie') ?? '';
	const cookieValue = cookieHeader
		.split(';')
		.map((part) => part.trim())
		.find((part) => part.startsWith(`${AGENT_SESSION_COOKIE}=`))
		?.slice(AGENT_SESSION_COOKIE.length + 1);
	const authHeader = headers.header('authorization');
	const bearerValue = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
	return auth.verify(cookieValue, bearerValue);
}
