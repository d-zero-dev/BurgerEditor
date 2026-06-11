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
 *
 * @param error
 */
export function writeErrorJson(error: unknown): void {
	const payload =
		error instanceof Error
			? { error: { name: error.name, message: error.message } }
			: { error: { name: 'UnknownError', message: String(error) } };
	process.stderr.write(JSON.stringify(payload) + '\n');
}
