import type {
	ReloadReason,
	ServerToBrowserMessage,
	UIState,
} from '../protocol/ws-messages.js';
import type { BlockOp } from '@burger-editor/cli';

import { randomUUID } from 'node:crypto';

import { log } from '../helpers/debug.js';
import { normalizeLogicalPath } from '../helpers/normalize-logical-path.js';

/**
 * The transport `TabHub` needs from a WebSocket connection — narrowed so
 * tests can inject a fake without touching `ws`/`@hono/node-ws`.
 */
export interface Socket {
	send(data: string): void;
	close(): void;
}

/** Thrown by `apply()` when the primary tab's browser nacked the op. */
export class ApplyNackError extends Error {
	readonly detail: unknown;
	readonly reason: string;

	constructor(reason: string, detail?: unknown) {
		super(`Tab nacked apply: ${reason}`);
		this.name = 'ApplyNackError';
		this.reason = reason;
		this.detail = detail;
	}
}

/** Thrown by `apply()` when no tab has this page open. */
export class NoPrimaryTabError extends Error {
	constructor(page: string) {
		super(`No open tab for page: ${page}`);
		this.name = 'NoPrimaryTabError';
	}
}

/** Thrown by `apply()` when the primary tab doesn't ack/nack in time. */
export class ApplyTimeoutError extends Error {
	constructor() {
		super('Tab did not respond to apply in time');
		this.name = 'ApplyTimeoutError';
	}
}

/** Thrown by `apply()` when the target tab disconnected before acking/nacking — a transport failure, not a rejection of the op. */
export class TabDisconnectedError extends Error {
	constructor() {
		super('Tab disconnected before responding');
		this.name = 'TabDisconnectedError';
	}
}

export interface AckResult {
	readonly revision: number;
	readonly html: string;
}

interface PendingApply {
	readonly resolve: (result: AckResult) => void;
	readonly reject: (error: Error) => void;
	readonly timer: ReturnType<typeof setTimeout>;
}

export interface TabSessionSnapshot {
	readonly id: string;
	readonly page: string | null;
	readonly revision: number;
	readonly syncedHash: string | null;
	readonly uiState: UIState | null;
	readonly lastActiveAt: number;
}

interface TabSessionInternal {
	readonly id: string;
	readonly socket: Socket;
	page: string | null;
	revision: number;
	syncedHash: string | null;
	uiState: UIState | null;
	lastActiveAt: number;
	readonly pendingApplies: Map<string, PendingApply>;
}

export interface HelloPayload {
	readonly page: string;
	readonly revision: number;
	readonly serverSession: string;
	readonly uiState: UIState;
}

export interface TabHubOptions {
	/** Milliseconds to wait for a tab's ack/nack before rejecting `apply()`. Defaults to 5000. */
	readonly applyTimeoutMs?: number;
	/** This server process's session token — a `hello` carrying a different one means the tab is talking to a stale process and gets an immediate `server-restart` reload. */
	readonly serverSession: string;
	/**
	 * A root-page tab's `hello` carries its own `location.pathname` ("/"),
	 * while an agent tool call addresses the same page by its full file name
	 * (e.g. "/index.html", read from page_list/page_blocks) — every `hello`'s
	 * `page` is normalized against this the same way `/api/content` does, so
	 * `primaryTabFor`/`apply` key off one canonical page string regardless of
	 * which side sent it. Defaults to `'index.html'`.
	 */
	readonly indexFileName?: string;
	readonly now?: () => number;
}

/**
 * Tracks connected browser tabs and relays `BlockOp`s to whichever one is
 * "primary" for a page — the browser-authority half of the Agent Hub: when a
 * tab has the page open, the tab's live engine applies the op and the
 * server persists what the tab acks, instead of the server mutating the
 * HTML string itself. Pure logic over an injected `Socket`
 * (`{ send, close }`) so it's testable without a real WebSocket.
 *
 * Deliberately does NOT know about disk state (`RevisionRegistry`) or the
 * `readToken` contract — `agent/route.ts` composes those with this hub. A
 * `TabSession`'s `syncedHash` is written by the caller (on `hello`, after a
 * successful `saved`/`committed`), not computed here, because only the
 * caller can hash the file on disk.
 */
export class TabHub {
	#applyTimeoutMs: number;
	#indexFileName: string;
	#now: () => number;
	#serverSession: string;
	#sessions = new Map<string, TabSessionInternal>();

	constructor(options: TabHubOptions) {
		this.#applyTimeoutMs = options.applyTimeoutMs ?? 5000;
		this.#indexFileName = options.indexFileName ?? 'index.html';
		this.#serverSession = options.serverSession;
		this.#now = options.now ?? (() => Date.now());
	}

	/**
	 * Send a `BlockOp` to one tab and wait for its ack/nack. Resolves with the
	 * browser's post-apply HTML on ack; rejects with {@link ApplyNackError} on
	 * nack, {@link NoPrimaryTabError} when no tab has the page open,
	 * {@link ApplyTimeoutError} if the tab never responds, or
	 * {@link TabDisconnectedError} if it disconnects first.
	 *
	 * `sessionId` pins the target to a tab the caller already chose (via
	 * {@link primaryTabFor}) — re-selecting here would let a `ui-state` or
	 * `pong` that arrived during the caller's own awaits swing the choice to
	 * a different tab, so a multi-op `page_update` could scatter across tabs
	 * and the caller's `syncedHash`/`reload` bookkeeping would name a tab
	 * that never applied anything. Without `sessionId` (or if that tab is
	 * gone) the primary for `page` is selected here.
	 * @param page
	 * @param area
	 * @param op
	 * @param baseRevision
	 * @param highlight
	 * @param sessionId
	 */
	apply(
		page: string,
		area: 'main' | 'draft',
		op: BlockOp,
		baseRevision: number,
		highlight = true,
		sessionId?: string,
	): Promise<AckResult> {
		const pinned = sessionId === undefined ? undefined : this.#sessions.get(sessionId);
		const target = pinned ?? this.#selectPrimary(page);
		if (!target) {
			return Promise.reject(new NoPrimaryTabError(page));
		}

		const id = randomUUID();
		const revision = target.revision + 1;
		return new Promise<AckResult>((resolve, reject) => {
			const timer = setTimeout(() => {
				target.pendingApplies.delete(id);
				reject(new ApplyTimeoutError());
			}, this.#applyTimeoutMs);
			target.pendingApplies.set(id, { resolve, reject, timer });
			this.#send(target, {
				type: 'apply',
				id,
				area,
				op,
				baseRevision,
				revision,
				highlight,
			});
		});
	}
	/**
	 * @param message
	 */
	broadcast(message: ServerToBrowserMessage): void {
		for (const session of this.#sessions.values()) {
			this.#send(session, message);
		}
	}
	/**
	 * @param sessionId
	 */
	disconnect(sessionId: string): void {
		const session = this.#sessions.get(sessionId);
		if (!session) {
			return;
		}
		for (const pending of session.pendingApplies.values()) {
			clearTimeout(pending.timer);
			pending.reject(new TabDisconnectedError());
		}
		this.#sessions.delete(sessionId);
	}
	dispose(): void {
		for (const session of this.#sessions.values()) {
			this.disconnect(session.id);
			session.socket.close();
		}
	}
	/**
	 * @param sessionId
	 */
	get(sessionId: string): TabSessionSnapshot | undefined {
		const session = this.#sessions.get(sessionId);
		return session && snapshot(session);
	}
	/**
	 * @param sessionId
	 * @param payload
	 * @returns `'accepted'` once `welcome` was sent, `'stale'` when the
	 *   session was instead sent a `server-restart` reload, or `'unknown'` for
	 *   a `sessionId` this hub never registered. `agent/hub.ts` uses this to
	 *   decide whether to log a `session-connected` event — a stale reconnect
	 *   is the same physical tab as before, not a new observable session.
	 */
	hello(sessionId: string, payload: HelloPayload): 'accepted' | 'stale' | 'unknown' {
		const session = this.#sessions.get(sessionId);
		if (!session) {
			log('hello from unknown session %s, ignoring', sessionId);
			return 'unknown';
		}
		session.page = normalizeLogicalPath(payload.page, this.#indexFileName);
		session.revision = payload.revision;
		session.uiState = payload.uiState;
		session.lastActiveAt = this.#now();
		if (payload.serverSession !== this.#serverSession) {
			log(
				'hello from %s carries a stale serverSession (%s vs current %s) — sending server-restart reload',
				sessionId,
				payload.serverSession,
				this.#serverSession,
			);
			this.#send(session, {
				type: 'reload',
				revision: payload.revision,
				reason: 'server-restart',
			});
			return 'stale';
		}
		log(
			'hello from %s: page=%s (raw: %s) revision=%d — sending welcome',
			sessionId,
			session.page,
			payload.page,
			payload.revision,
		);
		this.#send(session, { type: 'welcome', sessionId, revision: payload.revision });
		return 'accepted';
	}
	/**
	 * Ping every connected tab; disconnect (rejecting any in-flight applies)
	 * whichever session's socket throws. Callers on a real WebSocket transport
	 * additionally track pong timeouts at the transport layer — this hub only
	 * owns message shape, not liveness bookkeeping across ticks.
	 * @returns A snapshot of each session force-disconnected this way, taken
	 *   before it was removed — `agent/hub.ts`'s ping interval uses this to
	 *   append `session-disconnected` for a tab that vanished (crashed, was
	 *   killed) without a clean `/ws/editor` close, which never otherwise
	 *   goes through `AgentHub.closeSession`.
	 */
	pingAll(): readonly TabSessionSnapshot[] {
		const disconnected: TabSessionSnapshot[] = [];
		for (const session of this.#sessions.values()) {
			try {
				this.#send(session, { type: 'ping' });
			} catch {
				disconnected.push(snapshot(session));
				this.disconnect(session.id);
			}
		}
		return disconnected;
	}
	/**
	 * The tab BurgerEditor should apply an op through: the most recently
	 * active tab with `page` open that isn't mid-edit (no dialog open, not in
	 * source mode, not already processing another op). Falls back to the
	 * most recently active tab for the page if every tab is busy, so
	 * `apply()` still gets a definite nack instead of silently no-oping.
	 * @param page
	 */
	primaryTabFor(page: string): TabSessionSnapshot | null {
		const winner = this.#selectPrimary(page);
		return winner ? snapshot(winner) : null;
	}
	/**
	 * @param socket
	 */
	register(socket: Socket): string {
		const id = randomUUID();
		this.#sessions.set(id, {
			id,
			socket,
			page: null,
			revision: 0,
			syncedHash: null,
			uiState: null,
			lastActiveAt: this.#now(),
			pendingApplies: new Map(),
		});
		log('tab registered: %s (total connected: %d)', id, this.#sessions.size);
		return id;
	}

	/**
	 * @param sessionId
	 * @param revision
	 * @param reason
	 */
	reloadOne(sessionId: string, revision: number, reason: ReloadReason): void {
		const session = this.#sessions.get(sessionId);
		if (session) {
			this.#send(session, { type: 'reload', revision, reason });
		}
	}
	/**
	 * Push a `reload` to every OTHER tab that has `page` open — used after a
	 * disk-side write (Front Matter, another tab's commit) so tabs that
	 * didn't originate the change catch up.
	 * @param page
	 * @param exceptSessionId
	 * @param revision
	 * @param reason
	 */
	reloadOthers(
		page: string,
		exceptSessionId: string | null,
		revision: number,
		reason: ReloadReason,
	): void {
		for (const session of this.#sessions.values()) {
			if (session.page === page && session.id !== exceptSessionId) {
				this.#send(session, { type: 'reload', revision, reason });
			}
		}
	}
	/**
	 * @param sessionId
	 * @param id
	 * @param revision
	 * @param html
	 */
	resolveAck(sessionId: string, id: string, revision: number, html: string): void {
		const session = this.#sessions.get(sessionId);
		const pending = session?.pendingApplies.get(id);
		if (!session || !pending) {
			return;
		}
		clearTimeout(pending.timer);
		session.pendingApplies.delete(id);
		session.revision = revision;
		pending.resolve({ revision, html });
	}
	/**
	 * @param sessionId
	 * @param id
	 * @param reason
	 * @param detail
	 */
	resolveNack(sessionId: string, id: string, reason: string, detail?: unknown): void {
		const session = this.#sessions.get(sessionId);
		const pending = session?.pendingApplies.get(id);
		if (!session || !pending) {
			return;
		}
		clearTimeout(pending.timer);
		session.pendingApplies.delete(id);
		pending.reject(new ApplyNackError(reason, detail));
	}
	/**
	 * @param sessionId
	 * @param syncedHash
	 */
	setSyncedHash(sessionId: string, syncedHash: string): void {
		const session = this.#sessions.get(sessionId);
		if (session) {
			session.syncedHash = syncedHash;
		}
	}

	/**
	 * @param sessionId
	 * @param uiState
	 */
	setUIState(sessionId: string, uiState: UIState): void {
		const session = this.#sessions.get(sessionId);
		if (!session) {
			return;
		}
		session.uiState = uiState;
		session.lastActiveAt = this.#now();
	}
	/** Every connected tab, in registration order — used to build `editor_state_get`'s session list and the `/api/agent/status` debug payload. */
	snapshotAll(): readonly TabSessionSnapshot[] {
		return [...this.#sessions.values()].map(snapshot);
	}
	/**
	 * @param sessionId
	 */
	touch(sessionId: string): void {
		const session = this.#sessions.get(sessionId);
		if (session) {
			session.lastActiveAt = this.#now();
		}
	}

	/**
	 * The single primary-tab selection rule, shared by `primaryTabFor()` and
	 * `apply()`: among tabs on `page`, prefer idle ones, then the most
	 * recently active. Kept private so callers cannot end up computing the
	 * target twice with two different answers.
	 * @param page
	 */
	#selectPrimary(page: string): TabSessionInternal | null {
		const candidates = [...this.#sessions.values()].filter((s) => s.page === page);
		if (candidates.length === 0) {
			return null;
		}
		const idle = candidates.filter((s) => isIdle(s.uiState));
		const pool = idle.length > 0 ? idle : candidates;
		return mostRecentlyActive(pool);
	}

	#send(session: TabSessionInternal, message: ServerToBrowserMessage): void {
		session.socket.send(JSON.stringify(message));
	}
}

/**
 * @param pool
 */
function mostRecentlyActive(pool: readonly TabSessionInternal[]): TabSessionInternal {
	let winner = pool[0]!;
	for (const session of pool) {
		if (session.lastActiveAt > winner.lastActiveAt) {
			winner = session;
		}
	}
	return winner;
}

/**
 * Whether a tab reporting `uiState` isn't mid-edit — shared by
 * `TabHub`'s own primary-tab selection and `agent/hub.ts`'s `ui-idle` event
 * detection (a busy→idle transition on `ui-state` receipt), so the two never
 * disagree about what "idle" means.
 * @param uiState
 */
export function isIdle(uiState: UIState | null): boolean {
	if (!uiState) {
		return true;
	}
	return uiState.openDialog === null && !uiState.sourceMode && !uiState.processing;
}

/**
 * @param session
 */
function snapshot(session: TabSessionInternal): TabSessionSnapshot {
	return {
		id: session.id,
		page: session.page,
		revision: session.revision,
		syncedHash: session.syncedHash,
		uiState: session.uiState,
		lastActiveAt: session.lastActiveAt,
	};
}
