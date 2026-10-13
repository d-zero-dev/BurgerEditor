import type { AgentHub } from './hub.js';

import fs from 'node:fs';
import path from 'node:path';

import { computeContentHash } from '@burger-editor/cli';

import { log } from '../helpers/debug.js';
import { normalizeLogicalPath } from '../helpers/normalize-logical-path.js';

import { isExternallyChanged } from './hash-check.js';

export interface FsWatcher extends Disposable {
	/** @deprecated Use a `using` declaration, or call `this[Symbol.dispose]()` directly. */
	dispose(): void;
}

export interface FsWatcherOptions {
	readonly hub: AgentHub;
	readonly indexFileName: string;
}

/**
 * `fs.watch` callbacks are debounced per relative path by this much before
 * {@link handleChange} actually runs. A single logical write can otherwise
 * reach {@link handleChange} as more than one raw callback with real
 * elapsed time between them — not just the genuinely concurrent
 * (same-microtask-queue) double-fire `handleChange`'s own hash-recheck
 * already guards against — observed as an intermittent double `bump()`
 * (one edit reported as two revisions) specifically under GitHub Actions'
 * runners, never reproducible locally on macOS or in a local Linux/Docker
 * container. Collapsing repeated events for the same path into one
 * deferred call removes the raw-event-count dependency entirely, instead
 * of trying to widen the race window the recheck relies on.
 */
const FS_WATCH_DEBOUNCE_MS = 50;

/**
 * Watches `documentRoot` for changes made outside `local` (an IDE saving a
 * file directly, another process running in disk mode, `git checkout`, …)
 * and pushes an immediate `reload` to any tab with the affected page open,
 * instead of waiting for the next agent `invoke` to notice the drift
 * (`agent/route.ts`'s pre-flight staleness check already covers that path —
 * this is the proactive complement `editor_wait_for_event` needs to report a
 * `content-changed` event without the agent polling anything itself).
 *
 * **Scope**: only meaningful when `virtualTree` is disabled, i.e. a page's
 * disk-relative path IS its logical path. Under `virtualTree`, a disk
 * filename (`<id>.html`) only maps back to a logical path through the live
 * `ResolverState` the `ResolverStateStore` (`resolver-state-store.ts`) owns —
 * this watcher does not consume that store, since the existing per-`invoke`
 * passive check already covers virtualTree-enabled sites correctly, and
 * wiring the store through for a proactive nice-to-have isn't worth the
 * extra coupling. `commands/server.ts`'s `bootLocalServer` only calls
 * {@link createFsWatcher} when `virtualTree.enabled` is `false`.
 * @param documentRoot
 * @param options
 */
export function createFsWatcher(
	documentRoot: string,
	options: FsWatcherOptions,
): FsWatcher {
	const pendingByPath = new Map<string, NodeJS.Timeout>();

	const watcher = fs.watch(documentRoot, { recursive: true }, (_eventType, filename) => {
		if (!filename) {
			return;
		}
		const relativePath = filename.toString();
		const normalizedPage = normalizeLogicalPath(
			'/' + relativePath.split(path.sep).join('/'),
			options.indexFileName,
		);

		const existingTimer = pendingByPath.get(relativePath);
		if (existingTimer) {
			clearTimeout(existingTimer);
		}
		pendingByPath.set(
			relativePath,
			setTimeout(() => {
				pendingByPath.delete(relativePath);
				handleChange(options.hub, documentRoot, normalizedPage, relativePath).catch(
					(error) => {
						log('fs-watcher failed to process a change for %s: %o', relativePath, error);
					},
				);
			}, FS_WATCH_DEBOUNCE_MS),
		);
	});

	/** Real teardown; `[Symbol.dispose]` and the deprecated `dispose()` both forward here — neither depends on `this`. */
	function dispose(): void {
		watcher.close();
		for (const timer of pendingByPath.values()) {
			clearTimeout(timer);
		}
		pendingByPath.clear();
	}

	return { [Symbol.dispose]: dispose, dispose };
}

/**
 * Test-only: exported so `fs-watcher.spec.ts` can drive two concurrent
 * invocations directly (`Promise.all`) to reproduce the double-`fs.watch`-
 * callback race Linux's inotify triggers for a single write, without
 * depending on the real (platform-dependent, non-deterministic in a test)
 * number of native events one write produces.
 * @param hub
 * @param documentRoot
 * @param normalizedPage
 * @param relativePath
 */
export async function __handleChangeForTest(
	hub: AgentHub,
	documentRoot: string,
	normalizedPage: string,
	relativePath: string,
): Promise<void> {
	return handleChange(hub, documentRoot, normalizedPage, relativePath);
}

/**
 * @param hub
 * @param documentRoot
 * @param normalizedPage
 * @param relativePath
 */
async function handleChange(
	hub: AgentHub,
	documentRoot: string,
	normalizedPage: string,
	relativePath: string,
): Promise<void> {
	// No entry (or a never-seeded one) means no agent tool has ever read or
	// written this page — there's no baseline to compare against, and
	// reacting to it would mean reloading tabs for files the agent hub has
	// never touched (arbitrary assets, dotfiles, …).
	if (!hub.revisions.get(normalizedPage)?.persistedHash) {
		return;
	}

	const filePath = path.join(documentRoot, relativePath);
	let currentHash: string;
	try {
		currentHash = await computeContentHash(filePath);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			return;
		}
		throw error;
	}

	// Re-read AFTER the hash computation, not before it: Linux's inotify
	// commonly delivers two `fs.watch` callbacks for a single write (unlike
	// macOS's FSEvents, which coalesces them) — reading `entry` once up
	// front and awaiting `computeContentHash` would let both callbacks see
	// the same stale `persistedHash`, both conclude "changed", and both
	// `bump()` (revision advancing twice, two `reload`s, two
	// `content-changed` events for one real edit). No further `await`
	// happens between this re-read and `bump()` below, so whichever
	// callback's continuation runs second always observes the first one's
	// already-applied bump and no-ops here instead.
	const entry = hub.revisions.get(normalizedPage);
	if (!entry || !isExternallyChanged(entry, currentHash)) {
		// Either unchanged, a race with another callback for the same write
		// (see above), or this IS local's own write — `local` already bumped
		// `persistedHash` to `currentHash` synchronously before this
		// (debounced, async) fs.watch callback ever fires.
		return;
	}

	const bumped = hub.revisions.bump(normalizedPage, currentHash);
	hub.tabHub.reloadOthers(normalizedPage, null, bumped.revision, 'external-change');
	hub.events.append('content-changed', { page: normalizedPage });
}
