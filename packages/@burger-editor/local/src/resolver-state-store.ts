import type { ResolverState } from './model/virtual-path-resolver.js';

/**
 * The single owner of the live `ResolverState` plus the mutex that serializes
 * every read-modify-write against it. `/api/content`, `/api/content/create`,
 * and every `/api/agent/invoke` that writes disk all go through
 * {@link ResolverStateStore.withStateLock}, so a human save and an agent
 * invoke can never race each other onto the same file.
 */
export interface ResolverStateStore {
	/**
	 * Serialize a read-modify-write against the resolver state (and any disk
	 * write that must not race one). Two overlapping calls run one after the
	 * other, in call order — without this, two concurrent saves could both
	 * observe the same starting state and the later write would clobber the
	 * earlier one.
	 * @param work
	 */
	readonly withStateLock: <T>(work: () => Promise<T>) => Promise<T>;
	/** Current state; `null` when `virtualTree` is disabled. */
	getResolverState(): ResolverState | null;
	/**
	 * Advance the state. Call this ONLY after the corresponding disk write
	 * succeeded — callers implement a 2-phase commit (write, then advance)
	 * so a failed write never leaves the store pointing at a state the disk
	 * doesn't back.
	 * @param state
	 */
	setResolverState(state: ResolverState | null): void;
}

/**
 * Create the resolver-state store shared by every route that reads or
 * mutates the virtual file tree.
 * @param initial Pre-loaded resolver state, or `null` when `virtualTree` is disabled.
 * @example
 * const store = createResolverStateStore(null);
 * await store.withStateLock(async () => {
 *   // ...write to disk...
 *   store.setResolverState(next); // only after the write above succeeded
 * });
 */
export function createResolverStateStore(
	initial: ResolverState | null,
): ResolverStateStore {
	let resolverState: ResolverState | null = initial;
	let stateLock: Promise<unknown> = Promise.resolve();

	/**
	 * @param work
	 */
	function withStateLock<T>(work: () => Promise<T>): Promise<T> {
		const next = stateLock.then(work, work);
		stateLock = next.catch(() => {});
		return next;
	}

	return {
		withStateLock,
		getResolverState: () => resolverState,
		setResolverState: (state) => {
			resolverState = state;
		},
	};
}
