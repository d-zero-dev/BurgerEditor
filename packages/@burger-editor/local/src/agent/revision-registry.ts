export interface RevisionEntry {
	readonly revision: number;
	readonly persistedHash: string | null;
}

/**
 * Per-page `{ revision, persistedHash }`, where `persistedHash` is the
 * content hash of whatever `local` itself last wrote or read from disk.
 * Compared against a fresh disk hash in `agent/route.ts` to detect a change
 * that didn't come through `local` (an external edit, e.g. in an IDE) before
 * relaying a `BlockOp` to a browser tab. Entries are created lazily on first
 * access (`ensure`) rather than at server startup, since the set of pages
 * ever touched isn't known up front.
 */
export class RevisionRegistry {
	#entries = new Map<string, RevisionEntry>();

	/**
	 * @param path
	 * @param persistedHash
	 */
	bump(path: string, persistedHash: string): RevisionEntry {
		const current = this.ensure(path);
		const next: RevisionEntry = { revision: current.revision + 1, persistedHash };
		this.#entries.set(path, next);
		return next;
	}
	/**
	 * @param path
	 */
	ensure(path: string): RevisionEntry {
		const existing = this.#entries.get(path);
		if (existing) {
			return existing;
		}
		const created: RevisionEntry = { revision: 1, persistedHash: null };
		this.#entries.set(path, created);
		return created;
	}
	/**
	 * @param path
	 */
	get(path: string): RevisionEntry | undefined {
		return this.#entries.get(path);
	}

	/**
	 * @param path
	 * @param persistedHash
	 */
	setPersistedHash(path: string, persistedHash: string): RevisionEntry {
		const current = this.ensure(path);
		const next: RevisionEntry = { ...current, persistedHash };
		this.#entries.set(path, next);
		return next;
	}
}
