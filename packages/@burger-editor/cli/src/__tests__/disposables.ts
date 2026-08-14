import fs from 'node:fs/promises';
import { PassThrough } from 'node:stream';

/**
 * Replaces `process.stdin` with a `PassThrough` carrying the given payload
 * and TTY flag, restoring the original `process.stdin` on dispose.
 * @param isTTY - Forces `stdin.isTTY` so a test can pick the "piped" or
 * "interactive terminal" branch regardless of the vitest worker's own stdin
 * @param payload - Data to end the stream with, or `null` for an empty pipe
 * @returns A `Disposable` that restores `process.stdin`
 * @example
 * ```ts
 * using _ = mockStdin(false, JSON.stringify({ a: 1 }));
 * const result = await resolveSpec();
 * // process.stdin is restored automatically at the end of the scope
 * ```
 */
export function mockStdin(isTTY: boolean, payload: string | null): Disposable {
	const original = process.stdin;
	const mock = new PassThrough();
	Object.defineProperty(mock, 'isTTY', { value: isTTY, configurable: true });
	Object.defineProperty(process, 'stdin', { value: mock, configurable: true });
	mock.end(payload ?? '');
	return {
		[Symbol.dispose]() {
			Object.defineProperty(process, 'stdin', { value: original, configurable: true });
		},
	};
}

/**
 * `fs.chmod`s `target` to `mode`, restoring it to `0o755` on dispose.
 * @param target - Path to chmod
 * @param mode - The temporary mode to apply
 * @returns An `AsyncDisposable` that restores the mode to `0o755`
 * @example
 * ```ts
 * await using _ = await chmodScoped(readonlyDir, 0o555);
 * await expect(pageRename(ctx, 'a.html', 'readonly/b.html')).rejects.toThrow();
 * // readonlyDir is restored to 0o755 automatically at the end of the scope
 * ```
 */
export async function chmodScoped(
	target: string,
	mode: number,
): Promise<AsyncDisposable> {
	await fs.chmod(target, mode);
	return {
		async [Symbol.asyncDispose]() {
			await fs.chmod(target, 0o755);
		},
	};
}
