import type { MockInstance } from 'vitest';

import { vi } from 'vitest';

/**
 * `vi.spyOn()` wrapped as a `Disposable`, so a spy set up mid-test can be
 * held in a `using` declaration instead of a manual try/finally around
 * `spy.mockRestore()`.
 * @param object - The object whose method is being spied on
 * @param method - The method name to spy on
 * @returns The spy instance, also `Disposable` via `mockRestore()`
 * @example
 * ```ts
 * using spy = disposableSpy(fs, 'readFile');
 * spy.mockRejectedValueOnce(new Error('boom'));
 * // spy.mockRestore() runs automatically at the end of the scope
 * ```
 */
export function disposableSpy<T extends object, K extends keyof T>(
	object: T,
	method: K,
): MockInstance & Disposable {
	const spy = vi.spyOn(object, method as never) as unknown as MockInstance & Disposable;
	spy[Symbol.dispose] = () => {
		spy.mockRestore();
	};
	return spy;
}
