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
 * fs.watch delivery is OS-async and debounced — poll instead of asserting
 * right after the write.
 * @param condition
 * @param timeoutMs
 */
async function waitUntil(condition: () => boolean, timeoutMs = 8000): Promise<void> {
	const start = Date.now();
	while (!condition()) {
		if (Date.now() - start > timeoutMs) {
			throw new Error('condition never became true within timeout');
		}
		await new Promise((resolve) => setTimeout(resolve, 20));
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
let tmp: ({ path: string } & AsyncDisposable) | undefined;

afterEach(async () => {
	watcher?.dispose();
	watcher = undefined;
	hub?.dispose();
	hub = undefined;
	await tmp?.[Symbol.asyncDispose]();
	tmp = undefined;
});

describe('createFsWatcher', () => {
	test('detects an external change to a page local has already read/written and reloads open tabs', async () => {
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
		await fs.writeFile(filePath, '<p>externally edited</p>', 'utf8');

		await waitUntil(() => sent.some((m) => (m as { type: string }).type === 'reload'));
		expect(sent.at(-1)).toEqual({
			type: 'reload',
			revision: 3,
			reason: 'external-change',
		});
		expect(hub.events.since(0).events).toEqual([
			expect.objectContaining({ type: 'content-changed', payload: { page: '/a.html' } }),
		]);
	});

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
});
