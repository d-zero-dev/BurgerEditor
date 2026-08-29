import { afterEach, describe, expect, test, vi } from 'vitest';

import {
	ApplyNackError,
	ApplyTimeoutError,
	NoPrimaryTabError,
	TabDisconnectedError,
	TabHub,
} from './tab-hub.js';

/**
 * @param overrides
 */
function idleUiState(
	overrides: Partial<{
		openDialog: 'block-catalog' | 'block-options' | 'item-editor' | null;
		sourceMode: boolean;
		processing: boolean;
		editingBlockIndex: number | null;
	}> = {},
) {
	return {
		openDialog: null,
		sourceMode: false,
		processing: false,
		editingBlockIndex: null,
		...overrides,
	};
}

/**
 *
 */
function fakeSocket() {
	const sent: unknown[] = [];
	return {
		sent,
		socket: {
			send: (data: string) => sent.push(JSON.parse(data)),
			close: vi.fn(),
		},
	};
}

afterEach(() => {
	vi.useRealTimers();
});

describe('TabHub — hello / welcome', () => {
	test('sends welcome when serverSession matches', () => {
		const hub = new TabHub({ serverSession: 'srv-1' });
		const { socket, sent } = fakeSocket();
		const id = hub.register(socket);
		hub.hello(id, {
			page: '/a.html',
			revision: 1,
			serverSession: 'srv-1',
			uiState: idleUiState(),
		});
		expect(sent).toEqual([{ type: 'welcome', sessionId: id, revision: 1 }]);
	});

	test('sends a server-restart reload instead of welcome when serverSession differs', () => {
		const hub = new TabHub({ serverSession: 'srv-current' });
		const { socket, sent } = fakeSocket();
		const id = hub.register(socket);
		hub.hello(id, {
			page: '/a.html',
			revision: 3,
			serverSession: 'srv-stale',
			uiState: idleUiState(),
		});
		expect(sent).toEqual([{ type: 'reload', revision: 3, reason: 'server-restart' }]);
	});
});

describe('TabHub — primary tab selection', () => {
	test('picks the most recently active idle tab for a page', () => {
		let now = 0;
		const hub = new TabHub({ serverSession: 's', now: () => now });
		const a = fakeSocket();
		const b = fakeSocket();
		const idA = hub.register(a.socket);
		hub.hello(idA, {
			page: '/a.html',
			revision: 1,
			serverSession: 's',
			uiState: idleUiState(),
		});
		now = 10;
		const idB = hub.register(b.socket);
		hub.hello(idB, {
			page: '/a.html',
			revision: 1,
			serverSession: 's',
			uiState: idleUiState(),
		});

		expect(hub.primaryTabFor('/a.html')?.id).toBe(idB);
	});

	test('prefers an idle tab over a more recently active busy tab', () => {
		let now = 0;
		const hub = new TabHub({ serverSession: 's', now: () => now });
		const a = fakeSocket();
		const b = fakeSocket();
		const idA = hub.register(a.socket);
		now = 10;
		const idB = hub.register(b.socket);
		hub.hello(idA, {
			page: '/a.html',
			revision: 1,
			serverSession: 's',
			uiState: idleUiState(),
		});
		hub.hello(idB, {
			page: '/a.html',
			revision: 1,
			serverSession: 's',
			uiState: idleUiState({ sourceMode: true }),
		});

		expect(hub.primaryTabFor('/a.html')?.id).toBe(idA);
	});

	test('returns null when no tab has the page open', () => {
		const hub = new TabHub({ serverSession: 's' });
		expect(hub.primaryTabFor('/nowhere.html')).toBeNull();
	});
});

describe('TabHub — apply', () => {
	/**
	 *
	 */
	function connectedHub() {
		const hub = new TabHub({ serverSession: 's', applyTimeoutMs: 50 });
		const { socket, sent } = fakeSocket();
		const id = hub.register(socket);
		hub.hello(id, {
			page: '/a.html',
			revision: 1,
			serverSession: 's',
			uiState: idleUiState(),
		});
		return { hub, id, sent };
	}

	test('rejects with NoPrimaryTabError when the page has no open tab', async () => {
		const hub = new TabHub({ serverSession: 's' });
		await expect(
			hub.apply('/nowhere.html', 'main', { op: 'delete', index: 0 }, 1),
		).rejects.toBeInstanceOf(NoPrimaryTabError);
	});

	test('resolves with the ack payload when the tab acks', async () => {
		const { hub, id, sent } = connectedHub();
		const applyPromise = hub.apply('/a.html', 'main', { op: 'delete', index: 0 }, 1);
		const applyMessage = sent.at(-1) as { id: string };
		hub.resolveAck(id, applyMessage.id, 2, '<div>updated</div>');
		await expect(applyPromise).resolves.toEqual({
			revision: 2,
			html: '<div>updated</div>',
		});
	});

	test('rejects with ApplyNackError when the tab nacks', async () => {
		const { hub, id, sent } = connectedHub();
		const applyPromise = hub.apply('/a.html', 'main', { op: 'delete', index: 0 }, 1);
		const applyMessage = sent.at(-1) as { id: string };
		hub.resolveNack(id, applyMessage.id, 'user-editing', { editingBlockIndex: 0 });
		await expect(applyPromise).rejects.toBeInstanceOf(ApplyNackError);
	});

	test('rejects with ApplyTimeoutError when the tab never responds', async () => {
		vi.useFakeTimers();
		const { hub } = connectedHub();
		const applyPromise = hub.apply('/a.html', 'main', { op: 'delete', index: 0 }, 1);
		const assertion = expect(applyPromise).rejects.toBeInstanceOf(ApplyTimeoutError);
		await vi.advanceTimersByTimeAsync(50);
		await assertion;
	});

	test('rejects any pending apply when the tab disconnects first', async () => {
		const { hub, id } = connectedHub();
		const applyPromise = hub.apply('/a.html', 'main', { op: 'delete', index: 0 }, 1);
		hub.disconnect(id);
		await expect(applyPromise).rejects.toThrow('disconnected');
	});

	test('disconnect() while an apply is pending rejects it with TabDisconnectedError (name: "TabDisconnectedError")', async () => {
		const { hub, id } = connectedHub();
		const applyPromise = hub.apply('/a.html', 'main', { op: 'delete', index: 0 }, 1);
		hub.disconnect(id);
		const error = await applyPromise.catch((error_: unknown) => error_);
		expect(error).toBeInstanceOf(TabDisconnectedError);
		expect((error as Error).name).toBe('TabDisconnectedError');
		expect((error as Error).message).toBe('Tab disconnected before responding');
	});

	test('sends the apply frame with the exact shape { type, id, area, op, baseRevision, revision, highlight }', () => {
		const { hub, sent } = connectedHub();
		void hub
			.apply('/a.html', 'main', { op: 'delete', index: 0 }, 1, false)
			.catch(() => {});
		const applyMessage = sent.at(-1) as { id: string };
		expect(applyMessage).toEqual({
			type: 'apply',
			id: applyMessage.id,
			area: 'main',
			op: { op: 'delete', index: 0 },
			baseRevision: 1,
			revision: 2,
			highlight: false,
		});
	});
});

describe('TabHub — apply with a pinned sessionId', () => {
	/**
	 * Two idle tabs on the same page; B is more recently active, so B is the
	 * tab `#selectPrimary` would choose.
	 */
	function twoTabsHub() {
		let now = 0;
		const hub = new TabHub({ serverSession: 's', applyTimeoutMs: 50, now: () => now });
		const a = fakeSocket();
		const b = fakeSocket();
		const idA = hub.register(a.socket);
		hub.hello(idA, {
			page: '/a.html',
			revision: 1,
			serverSession: 's',
			uiState: idleUiState(),
		});
		now = 10;
		const idB = hub.register(b.socket);
		hub.hello(idB, {
			page: '/a.html',
			revision: 1,
			serverSession: 's',
			uiState: idleUiState(),
		});
		return { hub, idA, idB, a, b };
	}

	test('an explicit sessionId sends apply to THAT tab even though another tab on the page is more recently active', () => {
		const { hub, idA, idB, a, b } = twoTabsHub();
		expect(hub.primaryTabFor('/a.html')?.id).toBe(idB);

		void hub
			.apply('/a.html', 'main', { op: 'delete', index: 0 }, 1, true, idA)
			.catch(() => {});

		expect(a.sent.map((m) => (m as { type: string }).type)).toEqual(['welcome', 'apply']);
		expect(b.sent.map((m) => (m as { type: string }).type)).toEqual(['welcome']);
	});

	test('an unknown sessionId falls back to the selected primary for the page', () => {
		const { hub, idB, a, b } = twoTabsHub();
		expect(hub.primaryTabFor('/a.html')?.id).toBe(idB);

		void hub
			.apply('/a.html', 'main', { op: 'delete', index: 0 }, 1, true, 'no-such-session')
			.catch(() => {});

		expect(a.sent.map((m) => (m as { type: string }).type)).toEqual(['welcome']);
		expect(b.sent.map((m) => (m as { type: string }).type)).toEqual(['welcome', 'apply']);
	});

	test('a pinned tab that is busy still receives the apply — pinning is not re-selection', () => {
		const { hub, idA, a, b } = twoTabsHub();
		hub.setUIState(idA, idleUiState({ sourceMode: true }));

		void hub
			.apply('/a.html', 'main', { op: 'delete', index: 0 }, 1, true, idA)
			.catch(() => {});

		expect(a.sent.map((m) => (m as { type: string }).type)).toEqual(['welcome', 'apply']);
		expect(b.sent.map((m) => (m as { type: string }).type)).toEqual(['welcome']);
	});
});

describe('TabHub — reload broadcast', () => {
	test('reloadOthers pushes reload to every OTHER tab on the same page', () => {
		const hub = new TabHub({ serverSession: 's' });
		const a = fakeSocket();
		const b = fakeSocket();
		const idA = hub.register(a.socket);
		const idB = hub.register(b.socket);
		hub.hello(idA, {
			page: '/a.html',
			revision: 1,
			serverSession: 's',
			uiState: idleUiState(),
		});
		hub.hello(idB, {
			page: '/a.html',
			revision: 1,
			serverSession: 's',
			uiState: idleUiState(),
		});

		hub.reloadOthers('/a.html', idA, 2, 'other-tab');

		expect(a.sent).toEqual([{ type: 'welcome', sessionId: idA, revision: 1 }]);
		expect(b.sent).toEqual([
			{ type: 'welcome', sessionId: idB, revision: 1 },
			{ type: 'reload', revision: 2, reason: 'other-tab' },
		]);
	});
});
