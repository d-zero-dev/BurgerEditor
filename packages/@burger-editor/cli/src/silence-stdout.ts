/**
 * Redirects `process.stdout.write` to `process.stderr.write` for the scope
 * of a `using` declaration, restoring the original writer on dispose.
 *
 * User config files may print banners (e.g. dotenv's stdout tip) that would
 * otherwise corrupt this CLI's JSON-only stdout contract.
 * @returns A `Disposable` that restores `process.stdout.write` on dispose
 * @example
 * ```ts
 * using _ = silenceStdout();
 * await loadUserConfig(); // any stdout writes here go to stderr instead
 * // process.stdout.write is restored here, even if loadUserConfig() throws
 * ```
 */
export function silenceStdout(): Disposable {
	const saved = process.stdout.write;
	process.stdout.write = ((chunk: string | Uint8Array, ...rest: unknown[]) => {
		return process.stderr.write(chunk as never, ...(rest as []));
	}) as typeof process.stdout.write;
	return {
		[Symbol.dispose]() {
			process.stdout.write = saved;
		},
	};
}
