import type { AgentHub } from './hub.js';

import fs from 'node:fs/promises';
import path from 'node:path';

import { computeContentHash } from '@burger-editor/cli';
import { mkdtempDisposable } from '@d-zero/shared/mkdtemp-disposable';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { createFsWatcher, __handleChangeForTest, type FsWatcher } from './fs-watcher.js';
import { createAgentHub } from './hub.js';

const IDLE_UI_STATE = {
	openDialog: null,
	sourceMode: false,
	processing: false,
	editingBlockIndex: null,
};

/**
 * How long one {@link waitUntil} call polls before failing.
 */
const WAIT_TIMEOUT_MS = 8000;

/**
 * Probe writes are repeated this often while {@link waitForProbe} waits.
 */
const PROBE_INTERVAL_MS = 500;

/**
 * Vitest timeout for a test that makes `waits` {@link waitUntil} calls in a
 * row ({@link waitForProbe} is one call, {@link waitUntilProcessed} up to
 * three). Kept above their combined budget so a miss fails with
 * `waitUntil`'s description of the unmet condition and the observed state,
 * not a bare "Test timed out". The extra 5 s covers the test's own setup
 * (temporary directories, hashing) and the overshoot of each `waitUntil`
 * past its budget (one poll interval).
 * @param waits
 */
function testTimeoutFor(waits: number): number {
	return waits * WAIT_TIMEOUT_MS + 5000;
}

interface WaitUntilOptions {
	/** What the condition means, for the failure message. */
	readonly what: string;
	/**
	 * Snapshot of the state worth seeing when the condition is never met.
	 * Only evaluated on failure.
	 */
	readonly state: () => unknown;
	/** Called every {@link PROBE_INTERVAL_MS} while the condition is unmet. */
	readonly nudge?: () => Promise<void>;
}

/**
 * fs.watch delivery is OS-async and debounced — poll instead of asserting
 * right after the write.
 * @param condition
 * @param options
 */
async function waitUntil(
	condition: () => boolean,
	options: WaitUntilOptions,
): Promise<void> {
	const start = Date.now();
	let lastNudge = start;
	const nudgeErrors: unknown[] = [];
	while (!condition()) {
		const now = Date.now();
		const remaining = WAIT_TIMEOUT_MS - (now - start);
		if (remaining < 0) {
			const nudgeNote =
				nudgeErrors.length === 0
					? ''
					: `; ${nudgeErrors.length} nudge(s) failed, first: ${String(nudgeErrors[0])}`;
			throw new Error(
				`${options.what} did not happen within ${WAIT_TIMEOUT_MS} ms; state: ${JSON.stringify(options.state())}${nudgeNote}`,
			);
		}
		if (options.nudge && now - lastNudge >= PROBE_INTERVAL_MS) {
			lastNudge = now;
			let budgetTimer: NodeJS.Timeout | undefined;
			try {
				// Bounded by the remaining budget, so a write that never returns
				// still ends in the descriptive timeout above.
				await Promise.race([
					options.nudge(),
					new Promise((resolve) => {
						budgetTimer = setTimeout(resolve, remaining);
					}),
				]);
			} catch (error) {
				// Reported with the timeout, or as a warning below if the
				// condition is met anyway: a failed nudge is not the failure
				// this helper exists to describe.
				nudgeErrors.push(error);
			} finally {
				clearTimeout(budgetTimer);
			}
		}
		await new Promise((resolve) => setTimeout(resolve, 20));
	}
	if (nudgeErrors.length > 0) {
		// eslint-disable-next-line no-console
		console.warn(
			`${options.what}: ${nudgeErrors.length} nudge(s) failed before it happened, first:`,
			nudgeErrors[0],
		);
	}
}

/**
 * Records which pages the watcher has processed a change for, without that
 * leaving any trace in `sent` or `hub.events`, by spying on
 * `hub.revisions.get`: `handleChange` looks the page up there before
 * anything else, including for a page with no baseline that it then
 * ignores. Lets a "does not react" test prove the watcher did see the
 * change it is expected to ignore, instead of passing because the change
 * was never delivered at all.
 *
 * It counts every `hub.revisions.get` call, not only the watcher's, so a
 * test must not call `hub.revisions.get` itself between taking a `count()`
 * and waiting on it (`waitUntil`'s `state` only runs on failure).
 *
 * Relies on `handleChange` (`fs-watcher.ts`) looking a page up once if it
 * has no baseline (it returns right there) and twice if it has one (again
 * after hashing the file, right before deciding whether to bump) — see
 * {@link waitUntilProcessed}. If that changes, the waits built on it fail
 * with their description rather than pass silently.
 * @param hub
 */
function trackProcessedPages(hub: AgentHub) {
	const spy = vi.spyOn(hub.revisions, 'get');
	const pages = () => spy.mock.calls.map(([page]) => page);
	const count = (page: string) => pages().filter((p) => p === page).length;
	return { pages, count };
}

type ProcessedPages = ReturnType<typeof trackProcessedPages>;

let probeSequence = 0;

/**
 * Writes a new, untracked probe file (repeating the write until it shows
 * up) and waits until the watcher has processed it — the "write a cookie and
 * wait for it to come back" check Watchman uses
 * (https://facebook.github.io/watchman/docs/cookies). Two uses:
 *
 * - **Before a test's write**: proves the watcher is delivering changes,
 *   which it may not be right after `createFsWatcher()` returns (see the
 *   start-up window in `createFsWatcher`'s JSDoc).
 * - **After a test's write**: lets events delivered for that write, other
 *   than the first, arrive and be picked up — see {@link waitUntilProcessed}
 *   for what this does and does not guarantee.
 *
 * Each call uses a new file name, so a late event for an earlier probe
 * cannot satisfy a later wait.
 * @param documentRoot
 * @param processed
 */
async function waitForProbe(
	documentRoot: string,
	processed: ProcessedPages,
): Promise<void> {
	const name = `probe-${++probeSequence}.txt`;
	const probePath = path.join(documentRoot, name);
	let writes = 0;
	const writeProbe = () => fs.writeFile(probePath, `probe ${writes++}`, 'utf8');
	await writeProbe();
	await waitUntil(() => processed.count(`/${name}`) > 0, {
		what: `the watcher processing a probe write (${name})`,
		state: () => ({ processed: processed.pages() }),
		nudge: writeProbe,
	});
}

/**
 * Waits until the watcher has finished processing a write the test just
 * made to `page`:
 *
 * 1. a lookup of `page` after the write;
 * 2. a probe written after it (see {@link waitForProbe}). The lookup alone
 *    could come from a late event for an earlier write, such as the
 *    fixture's initial one; the probe is written after the test's write,
 *    so its event normally arrives after that write's events. Not
 *    guaranteed: the watcher debounces each path on its own timer, so a
 *    further raw event for `page` delayed past the debounce (Linux can
 *    deliver several per write) can still start one more `handleChange`
 *    after this returns. That one reads the same file content, so it
 *    cannot change what the test asserts;
 * 3. for a page with a baseline, an even number of lookups: each
 *    `handleChange` for such a page looks it up twice and decides
 *    synchronously right after the second one, so an even count means none
 *    of those started so far is still hashing the file (see
 *    {@link trackProcessedPages}). A page without one is done at its single
 *    lookup.
 * @param documentRoot
 * @param processed
 * @param page
 * @param countBeforeWrite `processed.count(page)` taken before the write
 * @param hasBaseline whether `page` has a `persistedHash`
 */
async function waitUntilProcessed(
	documentRoot: string,
	processed: ProcessedPages,
	page: string,
	countBeforeWrite: number,
	hasBaseline: boolean,
): Promise<void> {
	await waitUntil(() => processed.count(page) > countBeforeWrite, {
		what: `the watcher processing the write to ${page}`,
		state: () => ({ processed: processed.pages() }),
	});
	await waitForProbe(documentRoot, processed);
	if (hasBaseline) {
		await waitUntil(() => processed.count(page) % 2 === 0, {
			what: `the watcher finishing every change to ${page} it started`,
			state: () => ({ processed: processed.pages() }),
		});
	}
}

/**
 * @param hub
 * @param page
 */
function connectTab(hub: AgentHub, page: string) {
	const sent: unknown[] = [];
	const sessionId = hub.tabHub.register({
		send: (data) => sent.push(JSON.parse(data)),
		close: vi.fn(),
	});
	hub.tabHub.hello(sessionId, {
		page,
		revision: 1,
		serverSession: hub.serverSession,
		uiState: IDLE_UI_STATE,
	});
	return { sessionId, sent };
}

let hub: AgentHub | undefined;
let watcher: FsWatcher | undefined;
let controlHub: AgentHub | undefined;
let controlWatcher: FsWatcher | undefined;
let tmp: ({ path: string } & AsyncDisposable) | undefined;
let stagingTmp: ({ path: string } & AsyncDisposable) | undefined;

afterEach(async () => {
	watcher?.dispose();
	watcher = undefined;
	hub?.dispose();
	hub = undefined;
	controlWatcher?.dispose();
	controlWatcher = undefined;
	controlHub?.dispose();
	controlHub = undefined;
	await tmp?.[Symbol.asyncDispose]();
	tmp = undefined;
	await stagingTmp?.[Symbol.asyncDispose]();
	stagingTmp = undefined;
});

describe('createFsWatcher', () => {
	test(
		'detects an external change to a page local has already read/written and reloads open tabs',
		{
			timeout: testTimeoutFor(2),
		},
		async () => {
			tmp = await mkdtempDisposable('bge-fs-watcher-');
			const filePath = path.join(tmp.path, 'a.html');
			await fs.writeFile(filePath, '<p>original</p>', 'utf8');

			hub = createAgentHub({ pingIntervalMs: 60_000 });
			const { sent } = connectTab(hub, '/a.html');
			// bump() itself advances the revision (1 -> 2) while seeding the
			// baseline hash — the watcher's own detected change then bumps again
			// (2 -> 3), which is what `sent` should end up carrying.
			hub.revisions.bump('/a.html', await computeContentHash(filePath));

			watcher = createFsWatcher(tmp.path, { hub, indexFileName: 'index.html' });
			await waitForProbe(tmp.path, trackProcessedPages(hub));
			await fs.writeFile(filePath, '<p>externally edited</p>', 'utf8');

			await waitUntil(() => sent.some((m) => (m as { type: string }).type === 'reload'), {
				what: 'a reload for the external change',
				state: () => ({
					sent,
					revision: hub?.revisions.get('/a.html'),
					events: hub?.events.since(0).events,
				}),
			});
			expect(sent.at(-1)).toEqual({
				type: 'reload',
				revision: 3,
				reason: 'external-change',
			});
			expect(hub.events.since(0).events).toEqual([
				expect.objectContaining({
					type: 'content-changed',
					payload: { page: '/a.html' },
				}),
			]);
		},
	);

	test('two concurrent callbacks for the same write (Linux inotify double-fires) bump the revision only once', async () => {
		// Regression: Linux's inotify commonly delivers two `fs.watch`
		// callbacks for a single write, unlike macOS's FSEvents, which
		// coalesces them — confirmed via `yarn test`'s Docker/Linux run, where
		// this scenario originally bumped the revision twice for one edit.
		tmp = await mkdtempDisposable('bge-fs-watcher-concurrent-');
		const filePath = path.join(tmp.path, 'a.html');
		await fs.writeFile(filePath, '<p>original</p>', 'utf8');

		hub = createAgentHub({ pingIntervalMs: 60_000 });
		const { sent } = connectTab(hub, '/a.html');
		hub.revisions.bump('/a.html', await computeContentHash(filePath));

		await fs.writeFile(filePath, '<p>externally edited</p>', 'utf8');
		await Promise.all([
			__handleChangeForTest(hub, tmp.path, '/a.html', 'a.html'),
			__handleChangeForTest(hub, tmp.path, '/a.html', 'a.html'),
		]);

		expect(hub.revisions.get('/a.html')?.revision).toBe(3);
		expect(sent.filter((m) => (m as { type: string }).type === 'reload')).toHaveLength(1);
		expect(
			hub.events.since(0).events.filter((e) => e.type === 'content-changed'),
		).toHaveLength(1);
	});

	test('ignores a change to a file local has never read or written', async () => {
		tmp = await mkdtempDisposable('bge-fs-watcher-');
		const filePath = path.join(tmp.path, 'untouched.html');
		await fs.writeFile(filePath, '<p>original</p>', 'utf8');

		hub = createAgentHub({ pingIntervalMs: 60_000 });
		const { sent } = connectTab(hub, '/untouched.html');

		watcher = createFsWatcher(tmp.path, { hub, indexFileName: 'index.html' });
		await fs.writeFile(filePath, '<p>externally edited</p>', 'utf8');

		// No baseline means nothing to compare against — give the watcher a
		// beat to (not) react, then assert silence.
		await new Promise((resolve) => setTimeout(resolve, 200));
		expect(sent).toEqual([
			{ type: 'welcome', sessionId: expect.any(String), revision: 1 },
		]);
		expect(hub.events.since(0).events).toEqual([]);
	});

	test('ignores its own write (persistedHash already matches the new content)', async () => {
		tmp = await mkdtempDisposable('bge-fs-watcher-');
		const filePath = path.join(tmp.path, 'a.html');
		await fs.writeFile(filePath, '<p>original</p>', 'utf8');

		hub = createAgentHub({ pingIntervalMs: 60_000 });
		const { sent } = connectTab(hub, '/a.html');

		const newContent = '<p>saved by local itself</p>';
		await fs.writeFile(filePath, newContent, 'utf8');
		// Simulate `route.ts` having already bumped the registry to the hash of
		// what it just wrote, BEFORE the (debounced) fs.watch callback fires.
		hub.revisions.bump('/a.html', await computeContentHash(filePath));

		watcher = createFsWatcher(tmp.path, { hub, indexFileName: 'index.html' });

		await new Promise((resolve) => setTimeout(resolve, 200));
		expect(sent).toEqual([
			{ type: 'welcome', sessionId: expect.any(String), revision: 1 },
		]);
		expect(hub.events.since(0).events).toEqual([]);
	});

	test('dispose() stops reacting to further changes', async () => {
		tmp = await mkdtempDisposable('bge-fs-watcher-');
		const filePath = path.join(tmp.path, 'a.html');
		await fs.writeFile(filePath, '<p>original</p>', 'utf8');

		hub = createAgentHub({ pingIntervalMs: 60_000 });
		const { sent } = connectTab(hub, '/a.html');
		hub.revisions.bump('/a.html', await computeContentHash(filePath));

		watcher = createFsWatcher(tmp.path, { hub, indexFileName: 'index.html' });
		watcher.dispose();

		await fs.writeFile(filePath, '<p>externally edited after dispose</p>', 'utf8');
		await new Promise((resolve) => setTimeout(resolve, 200));

		expect(sent).toEqual([
			{ type: 'welcome', sessionId: expect.any(String), revision: 1 },
		]);
		expect(hub.events.since(0).events).toEqual([]);
	});

	test(
		'processes but ignores a change to a file local has never read or written, once the watcher is delivering changes',
		{
			timeout: testTimeoutFor(3),
		},
		async () => {
			tmp = await mkdtempDisposable('bge-fs-watcher-');
			const filePath = path.join(tmp.path, 'untouched.html');
			await fs.writeFile(filePath, '<p>original</p>', 'utf8');

			hub = createAgentHub({ pingIntervalMs: 60_000 });
			const { sent } = connectTab(hub, '/untouched.html');

			watcher = createFsWatcher(tmp.path, { hub, indexFileName: 'index.html' });
			const processed = trackProcessedPages(hub);
			await waitForProbe(tmp.path, processed);

			const countBeforeEdit = processed.count('/untouched.html');
			await fs.writeFile(filePath, '<p>externally edited</p>', 'utf8');
			await waitUntilProcessed(
				tmp.path,
				processed,
				'/untouched.html',
				countBeforeEdit,
				false,
			);

			expect(sent).toEqual([
				{ type: 'welcome', sessionId: expect.any(String), revision: 1 },
			]);
			expect(hub.events.since(0).events).toEqual([]);
		},
	);

	test(
		'processes but ignores a change to a page whose registry entry has no persistedHash yet',
		{
			timeout: testTimeoutFor(3),
		},
		async () => {
			tmp = await mkdtempDisposable('bge-fs-watcher-');
			const filePath = path.join(tmp.path, 'a.html');
			await fs.writeFile(filePath, '<p>original</p>', 'utf8');

			hub = createAgentHub({ pingIntervalMs: 60_000 });
			const { sent } = connectTab(hub, '/a.html');
			// An entry exists (revision 1) but local has never read or written the
			// file, so there is still no baseline to compare against.
			hub.revisions.ensure('/a.html');

			watcher = createFsWatcher(tmp.path, { hub, indexFileName: 'index.html' });
			const processed = trackProcessedPages(hub);
			await waitForProbe(tmp.path, processed);

			const countBeforeEdit = processed.count('/a.html');
			await fs.writeFile(filePath, '<p>externally edited</p>', 'utf8');
			await waitUntilProcessed(tmp.path, processed, '/a.html', countBeforeEdit, false);

			expect(hub.revisions.get('/a.html')).toEqual({ revision: 1, persistedHash: null });
			expect(sent).toEqual([
				{ type: 'welcome', sessionId: expect.any(String), revision: 1 },
			]);
			expect(hub.events.since(0).events).toEqual([]);
		},
	);

	test(
		'processes but ignores its own write made while the watcher is delivering changes (persistedHash already matches)',
		{
			timeout: testTimeoutFor(4),
		},
		async () => {
			tmp = await mkdtempDisposable('bge-fs-watcher-');
			const filePath = path.join(tmp.path, 'a.html');
			await fs.writeFile(filePath, '<p>original</p>', 'utf8');

			hub = createAgentHub({ pingIntervalMs: 60_000 });
			const { sent } = connectTab(hub, '/a.html');
			// Seeding the baseline advances the revision 1 -> 2; local's own write
			// below advances it to 3, and the watcher must not add a fourth.
			hub.revisions.bump('/a.html', await computeContentHash(filePath));

			// Hash the new content up front, outside the watched directory: hashing
			// the watched file after writing it would race the watcher's 50 ms
			// debounce, while `route.ts` bumps right after its own write.
			const newContent = '<p>saved by local itself</p>';
			stagingTmp = await mkdtempDisposable('bge-fs-watcher-staging-');
			const stagingPath = path.join(stagingTmp.path, 'a.html');
			await fs.writeFile(stagingPath, newContent, 'utf8');
			const newHash = await computeContentHash(stagingPath);

			watcher = createFsWatcher(tmp.path, { hub, indexFileName: 'index.html' });
			const processed = trackProcessedPages(hub);
			await waitForProbe(tmp.path, processed);

			const countBeforeWrite = processed.count('/a.html');
			await fs.writeFile(filePath, newContent, 'utf8');
			hub.revisions.bump('/a.html', newHash);
			await waitUntilProcessed(tmp.path, processed, '/a.html', countBeforeWrite, true);

			expect(hub.revisions.get('/a.html')?.revision).toBe(3);
			expect(sent).toEqual([
				{ type: 'welcome', sessionId: expect.any(String), revision: 1 },
			]);
			expect(hub.events.since(0).events).toEqual([]);
		},
	);

	test(
		'dispose() stops reacting to a change that a live watcher on the same directory does process',
		{
			timeout: testTimeoutFor(5),
		},
		async () => {
			tmp = await mkdtempDisposable('bge-fs-watcher-');
			const filePath = path.join(tmp.path, 'a.html');
			await fs.writeFile(filePath, '<p>original</p>', 'utf8');

			hub = createAgentHub({ pingIntervalMs: 60_000 });
			const { sent } = connectTab(hub, '/a.html');
			hub.revisions.bump('/a.html', await computeContentHash(filePath));

			watcher = createFsWatcher(tmp.path, { hub, indexFileName: 'index.html' });
			const processed = trackProcessedPages(hub);
			await waitForProbe(tmp.path, processed);
			watcher.dispose();
			// A change being processed at dispose() time (the fixture's initial
			// write, delivered late) may still finish; let it before counting.
			await waitUntil(() => processed.count('/a.html') % 2 === 0, {
				what: 'the disposed watcher finishing a change to /a.html it started',
				state: () => ({ processed: processed.pages() }),
			});

			// A second watcher with its own hub shows when the write below has
			// actually been delivered and processed, so the disposed watcher's
			// silence is checked after that point instead of after a fixed delay.
			// The control hub has no baseline for /a.html, so it only looks the
			// page up and ignores it.
			controlHub = createAgentHub({ pingIntervalMs: 60_000 });
			controlWatcher = createFsWatcher(tmp.path, {
				hub: controlHub,
				indexFileName: 'index.html',
			});
			const controlProcessed = trackProcessedPages(controlHub);
			await waitForProbe(tmp.path, controlProcessed);

			const countBeforeEdit = processed.count('/a.html');
			const controlCountBeforeEdit = controlProcessed.count('/a.html');
			await fs.writeFile(filePath, '<p>externally edited after dispose</p>', 'utf8');
			await waitUntilProcessed(
				tmp.path,
				controlProcessed,
				'/a.html',
				controlCountBeforeEdit,
				false,
			);

			expect(processed.count('/a.html')).toBe(countBeforeEdit);
			expect(sent).toEqual([
				{ type: 'welcome', sessionId: expect.any(String), revision: 1 },
			]);
			expect(hub.events.since(0).events).toEqual([]);
		},
	);
});
