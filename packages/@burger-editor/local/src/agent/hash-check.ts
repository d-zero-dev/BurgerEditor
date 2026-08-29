import type { RevisionEntry } from './revision-registry.js';

/**
 * Whether a freshly computed disk hash means the page changed outside
 * `local` since `entry.persistedHash` was last set — the "external-change"
 * check shared by `agent/route.ts`'s pre-flight staleness gate (a `BlockOp`
 * about to relay to a browser tab) and `agent/fs-watcher.ts`'s passive
 * `fs.watch` detection. `persistedHash === null` means the page has never
 * been read or written through `local`, so there's no baseline to compare
 * against yet — not itself a change.
 * @param entry
 * @param currentHash
 */
export function isExternallyChanged(entry: RevisionEntry, currentHash: string): boolean {
	return entry.persistedHash !== null && entry.persistedHash !== currentHash;
}
