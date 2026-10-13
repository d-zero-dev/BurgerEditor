import { afterEach, beforeEach, vi } from 'vitest';

/**
 * Silence `console.error` for the current test file only (registers its
 * own `beforeEach`/`afterEach`, so this must be called at a describe/
 * module's top level, not inside a `test()`).
 *
 * Several Browser Mode specs hit known false-positive React warnings
 * (act-wrapping noise around a real browser async event, or a
 * Suspense/act warning from reading an already-fulfilled-tagged
 * thenable) that don't indicate a real bug — see each call site's own
 * comment for which warning and why. Scoped per-file instead of a
 * global `setup.ts` override, so an unrelated regression's act warning
 * elsewhere still surfaces.
 * @param patterns - Substrings to match against `console.error`'s first
 * argument; matching calls are dropped, everything else passes through.
 * Omit to silence every `console.error` call in this file instead (e.g.
 * when the test intentionally throws and React's own double-logging of
 * an already-caught error is the only thing to silence).
 * @example
 * ```ts
 * suppressConsoleErrors('was not wrapped in act(...)');
 * ```
 */
export function suppressConsoleErrors(patterns?: readonly string[]): void {
	let spy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		const originalConsoleError = console.error.bind(console);
		spy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
			if (!patterns) {
				return;
			}
			const [first] = args;
			if (
				typeof first === 'string' &&
				patterns.some((pattern) => first.includes(pattern))
			) {
				return;
			}
			originalConsoleError(...args);
		});
	});

	afterEach(() => {
		spy.mockRestore();
	});
}
