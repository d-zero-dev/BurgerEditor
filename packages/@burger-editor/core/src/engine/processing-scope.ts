/**
 * Structural shape accepted by `beginProcessing`. A plain interface (rather
 * than `BurgerEditorEngine`) so test doubles that only implement
 * `isProcessed` can be used without depending on the concrete engine class.
 */
export interface ProcessingHost {
	isProcessed: boolean;
}

/**
 * Marks `engine.isProcessed` as `true` for the current scope and guarantees
 * it is reset to `false` when the scope exits, including via an exception.
 * Replaces the `engine.isProcessed = true; ...; engine.isProcessed = false;`
 * pattern, which left the flag stuck on `true` (freezing all engine
 * commands) whenever the code in between threw.
 * @param engine - Any object exposing a mutable `isProcessed` flag
 * @returns A `Disposable` that resets `isProcessed` to `false` on dispose
 * @example
 * ```ts
 * using _processing = beginProcessing(engine);
 * await doSomethingThatMightThrow();
 * // isProcessed is reset to false even if the line above throws
 * ```
 */
export function beginProcessing(engine: ProcessingHost): Disposable {
	engine.isProcessed = true;
	return {
		[Symbol.dispose]() {
			engine.isProcessed = false;
		},
	};
}
