/**
 * Wraps a teardown function so it is also `Disposable`, letting callers
 * either invoke it directly (`detach()`) or hold it in a `using`
 * declaration (`using _ = detach;`). `fn` itself is returned (mutated with
 * `[Symbol.dispose]`), not a wrapper, so identity-sensitive callers (e.g.
 * `Map` keys) keep working.
 * @param fn - The teardown function to make `Disposable`
 * @returns `fn`, with `[Symbol.dispose]` added
 * @example
 * ```ts
 * function on(name: string, listener: () => void): (() => void) & Disposable {
 * 	target.addEventListener(name, listener);
 * 	return asDisposableFn(() => target.removeEventListener(name, listener));
 * }
 * ```
 */
export function asDisposableFn<T extends () => void>(fn: T): T & Disposable {
	return Object.assign(fn, { [Symbol.dispose]: fn });
}
