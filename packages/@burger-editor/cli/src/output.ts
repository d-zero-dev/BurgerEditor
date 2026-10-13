import { toAgentError } from './agent-tools/errors.js';

/**
 * Single-source JSON writer for the CLI. Always emits a single JSON value on
 * stdout (with trailing newline). Errors go to stderr as JSON too.
 *
 * `bin.ts` redirects `process.stdout.write` to stderr to keep the JSON channel
 * clean while user config files load; we accept a fresh writer reference here
 * so the redirect cannot accidentally swallow our payload.
 * @param value
 * @param writer
 */
export function writeJson(value: unknown, writer?: typeof process.stdout.write): void {
	const write = writer ?? process.stdout.write.bind(process.stdout);
	write(JSON.stringify(value) + '\n');
}

/**
 * Errors go out in the same `agentErrorSchema` shape (`error`, `message`,
 * and — when the failure came from a readToken check — `next`/`readToken`/
 * `currentBlocks`) that MCP tool calls use. A disk-mode CLI user reading
 * stderr gets the same self-recovery hints (a fresh `readToken` to retry
 * with) an MCP-connected agent gets from the same failure, instead of a
 * bare `{name, message}` that carries none of that.
 * @param error
 */
export function writeErrorJson(error: unknown): void {
	const payload = toAgentError(error).toPayload();
	process.stderr.write(JSON.stringify(payload) + '\n');
}
