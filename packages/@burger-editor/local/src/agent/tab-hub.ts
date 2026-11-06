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
 * tests can inject a fake without touching `ws`/`@hono/node-server`.
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
	/**
	 * The hash of the file content the tab shows (`computeContentHash`). It
	 * comes from `hello`'s `contentHash` (the hash of the file the page was
	 * served from), then from a human save made in this tab
	 * (`routes/content-api.ts`), an acked op or {@link TabHub.commit}. `null`
	 * means unknown: a `hello` without `contentHash` (a client without one).
	 * `agent/route.ts` relays an op only to a tab whose `syncedHash` matches the
	 * file on disk (or is unknown), so an op never lands on stale content.
	 */
	readonly syncedHash: string | null;
	/**
	 * The tab was sent a `reload` and has not reconnected since: its content is
	 * behind disk even when `syncedHash` is unknown, until it reloads (a new
	 * session) or is marked in step again ({@link TabHub.setSyncedHash},
	 * {@link TabHub.commit}).
	 */
	readonly reloadRequested: boolean;
	/**
	 * The tab's main-area HTML as the editor normalized it on open (raw HTML
	 * wrapped into a fallback block, legacy markup migrated, …), reported in
	 * `hello`. `null` once the tab's content has reached disk by any route (a
	 * human save, an acked op, {@link TabHub.commit}), so a reconnecting tab
	 * never re-sends content disk already has.
	 *
	 * Opening a page never writes it (issue #966), so after such a
	 * normalization the tab's blocks and the file's blocks differ. An agent
	 * reads block indices from disk while a browser-applied op is applied to
	 * the tab by index — left alone, the op would hit a different block. The
	 * client only reports this when the block list itself changed
	 * (`client/block-structure.ts`'s `hasBlockStructureChanged`, which also
	 * explains why a plain string comparison is not used), not for mere
	 * re-serialization.
	 *
	 * `agent/route.ts`'s `runViaBrowserOrDisk` consumes it: when the primary
	 * tab still holds one, the next agent mutation of that page writes this
	 * HTML to disk once (instead of applying the op), sends `committed` to the
	 * tab, and fails with `stale` carrying a fresh `readToken` so the agent
	 * re-reads before retrying. That write still records a `content-saved`
	 * event (`appliedTo: 'browser'`, since the content came from the tab), so
	 * the event alone does not mean the agent's op landed. Opening or reading
	 * the page alone never triggers that write — only a mutation that would
	 * have written anyway.
	 */
	readonly normalizedHtml: string | null;
	readonly uiState: UIState | null;
	readonly lastActiveAt: number;
}

interface TabSessionInternal {
	readonly id: string;
	readonly socket: Socket;
	page: string | null;
	revision: number;
	syncedHash: string | null;
	reloadRequested: boolean;
	normalizedHtml: string | null;
	uiState: UIState | null;
	lastActiveAt: number;
	readonly pendingApplies: Map<string, PendingApply>;
}

export interface HelloPayload {
	readonly page: string;
	readonly revision: number;
	readonly serverSession: string;
	readonly uiState: UIState;
	readonly normalizedHtml?: string;
	/** The hash of the file content the page was served from — becomes the tab's {@link TabSessionSnapshot.syncedHash}. */
	readonly contentHash?: string;
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
 * tab's `syncedHash` comes from outside, never computed here, because only the
 * caller can hash the file on disk: the `contentHash` the tab echoes in
 * `hello` (hashed when its page was served), a human save from that tab, an
 * acked op or a commit.
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
	 * @param exceptSessionId - A tab not to send it to (the one that caused it)
	 */
	broadcast(
		message: ServerToBrowserMessage,
		exceptSessionId: string | null = null,
	): void {
		for (const session of this.#sessions.values()) {
			if (session.id !== exceptSessionId) {
				this.#send(session, message);
			}
		}
	}
	/**
	 * Record that the tab's current content has been written to disk on its
	 * behalf (its {@link TabSessionSnapshot.normalizedHtml}), and tell the tab
	 * with a `committed` frame so it stops reporting it on reconnect.
	 * @param sessionId
	 * @param syncedHash - Hash of the file as written
	 */
	commit(sessionId: string, syncedHash: string): void {
		const session = this.#sessions.get(sessionId);
		if (!session) {
			return;
		}
		session.syncedHash = syncedHash;
		session.reloadRequested = false;
		session.normalizedHtml = null;
		this.#send(session, { type: 'committed', revision: session.revision });
	}
	/**
	 * Drop the tab's unsaved {@link TabSessionSnapshot.normalizedHtml} without
	 * marking it in step with disk — for a tab that did not make the save that
	 * just reached disk: its normalization was built on the file before that
	 * save, so writing it later would undo the save.
	 * @param sessionId
	 */
	discardNormalization(sessionId: string): void {
		const session = this.#sessions.get(sessionId);
		if (session) {
			session.normalizedHtml = null;
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
		session.normalizedHtml = payload.normalizedHtml ?? null;
		if (payload.contentHash !== undefined) {
			session.syncedHash = payload.contentHash;
		}
		session.lastActiveAt = this.#now();
		if (payload.serverSession !== this.#serverSession) {
			log(
				'hello from %s carries a stale serverSession (%s vs current %s) — sending server-restart reload',
				sessionId,
				payload.serverSession,
				this.#serverSession,
			);
			session.reloadRequested = true;
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
	 * Mark every OTHER tab that has `page` open as behind disk, without telling
	 * it to reload — for a page that moved to another path, where reloading the
	 * old path would answer Not Found. The tabs stop receiving agent ops and
	 * their saves are refused until they reconnect.
	 * @param page
	 * @param exceptSessionId
	 */
	markBehind(page: string, exceptSessionId: string | null): void {
		for (const session of this.#sessions.values()) {
			if (session.page === page && session.id !== exceptSessionId) {
				session.reloadRequested = true;
			}
		}
	}
	/**
	 * Record that a tab now shows another page: its own save moved the page to
	 * another path (virtual tree), and the tab followed it without reloading.
	 * @param sessionId
	 * @param page - The new page (normalized like a `hello`'s)
	 */
	movePage(sessionId: string, page: string): void {
		const session = this.#sessions.get(sessionId);
		if (session) {
			session.page = normalizeLogicalPath(page, this.#indexFileName);
		}
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
	 * The tab BurgerEditor should apply an op through: among the tabs with
	 * `page` open, those in step with disk (not told to reload, and showing
	 * `diskHash` when both are known) first, then the most recently active one
	 * that isn't mid-edit (no dialog open, not in source mode, not already
	 * processing another op). Falls back to a tab that is behind or busy when
	 * no other is open, so the caller still answers definitely (`stale`, or a
	 * nack) instead of silently no-oping.
	 * @param page
	 * @param diskHash - The hash of the file on disk, when the caller has it
	 */
	primaryTabFor(page: string, diskHash?: string): TabSessionSnapshot | null {
		const winner = this.#selectPrimary(page, diskHash);
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
			reloadRequested: false,
			normalizedHtml: null,
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
			session.reloadRequested = true;
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
				session.reloadRequested = true;
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
		// The acked HTML is built on top of the normalized content and is
		// what the caller persists next.
		session.normalizedHtml = null;
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
	 * Mark the tab as in step with the file on disk at `syncedHash`. Also drops
	 * its pending {@link TabSessionSnapshot.normalizedHtml}: whatever is on
	 * disk now is the baseline, so there is nothing left to bring in from it.
	 * @param sessionId
	 * @param syncedHash
	 */
	setSyncedHash(sessionId: string, syncedHash: string): void {
		const session = this.#sessions.get(sessionId);
		if (session) {
			session.syncedHash = syncedHash;
			session.reloadRequested = false;
			session.normalizedHtml = null;
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
	 * `apply()`: among tabs on `page`, prefer tabs in step with disk (not told
	 * to reload, and showing `diskHash` when both are known), then idle ones,
	 * then the most recently active. Kept private so callers cannot end up
	 * computing the target twice with two different answers. A tab that is
	 * behind can still win when it is the only one — `agent/route.ts` then
	 * answers `stale` instead of relaying.
	 * @param page
	 * @param diskHash - The hash of the file on disk, when the caller has it
	 */
	#selectPrimary(page: string, diskHash?: string): TabSessionInternal | null {
		const candidates = [...this.#sessions.values()].filter((s) => s.page === page);
		if (candidates.length === 0) {
			return null;
		}
		const inStep = candidates.filter((s) => isInStep(s, diskHash));
		const pool = inStep.length > 0 ? inStep : candidates;
		const idle = pool.filter((s) => isIdle(s.uiState));
		return mostRecentlyActive(idle.length > 0 ? idle : pool);
	}

	#send(session: TabSessionInternal, message: ServerToBrowserMessage): void {
		session.socket.send(JSON.stringify(message));
	}
}

/**
 * Whether a tab shows the content on disk as far as the hub knows: it was not
 * told to reload, and its content hash matches `diskHash` when both are known.
 * @param session
 * @param diskHash
 */
function isInStep(session: TabSessionInternal, diskHash: string | undefined): boolean {
	if (session.reloadRequested) {
		return false;
	}
	return (
		session.syncedHash === null ||
		diskHash === undefined ||
		session.syncedHash === diskHash
	);
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
		reloadRequested: session.reloadRequested,
		normalizedHtml: session.normalizedHtml,
		uiState: session.uiState,
		lastActiveAt: session.lastActiveAt,
	};
}
