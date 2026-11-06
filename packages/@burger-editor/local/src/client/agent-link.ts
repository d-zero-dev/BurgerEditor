import type {
	ApplyMessage,
	BlockOp,
	BrowserToServerMessage,
	PageEventMessage,
	ReloadReason,
	ServerToBrowserMessage,
	UIState,
} from '../protocol/ws-messages.js';

import { browserLog } from '../helpers/browser-log.js';
import { serverToBrowserMessageSchema } from '../protocol/ws-messages.js';

const PROCESSING_WAIT_TIMEOUT_MS = 2000;
const LOG_TAG = '[bge-agent-link]';

/**
 * What `agent-link.ts` needs from a live editor, narrowed to exactly the
 * operations this feature touches — kept separate from
 * `client/engine-adapter.ts` (the real `BurgerEditorEngine`-backed
 * implementation) so this file's decision logic can be tested against a
 * fake instead of a full editor instance.
 */
export interface EditorAdapter {
	getUIState(): UIState;
	/**
	 * `onBeforeMutate` must be invoked synchronously right before the first
	 * DOM mutation (after any highlight animation) — the link arms its
	 * echo suppression there, so a human save that lands mid-highlight is
	 * not mistaken for this op's own save.
	 */
	applyOp(
		op: BlockOp,
		options: { highlight: boolean; onBeforeMutate: () => void },
	): Promise<{ html: string }>;
	reload(): void;
	/** Register a listener invoked whenever the UI state might have changed; returns an unsubscribe function. */
	subscribeUIState(listener: () => void): () => void;
}

/** What `agent-link.ts` needs to send frames — satisfied by `ws-transport.ts`'s `WsTransport`. Its `onMessage`/`onOpen` are wired directly to this link's `handleMessage`/`handleOpen` by the caller (`create-editor.ts`), not through this interface. */
export interface Transport {
	send(raw: string): void;
}

export interface AgentLink {
	/**
	 * Call from the editor's `onUpdated` handler, before doing anything
	 * else. Returns `true` exactly once per browser-applied op — the save
	 * `applyOp` triggers internally (via `engine.save()`) — so the caller
	 * can skip re-POSTing content the server already has.
	 */
	consumeEcho(): boolean;
	/**
	 * Call when a save for a reason other than an agent-applied op (a human edit) has reached disk — not after a failed one, which leaves the open-time `normalizedHtml` still unsaved.
	 * @param contentHash - The hash of what was written (`POST /api/content`'s `contentHash`). It replaces the `contentHash` the next `hello` reports; omit it to keep the previous one
	 */
	notifyHumanSave(contentHash?: string): void;
	/**
	 * This tab's Agent Hub session (the `welcome` `sessionId`), or `null` before
	 * `welcome` arrives (including after a reconnect, which is a new session).
	 * Sent with a human save so the server marks only this tab in step with disk.
	 */
	readonly sessionId: string | null;
	/**
	 * Call when this tab's own save moved the page to another path (virtual
	 * tree); the next `hello` (after a reconnect) reports the new page.
	 * @param page - The new page, normalized like `AgentLinkOptions.page`
	 */
	notifyPageMoved(page: string): void;
	/** Call when the browser tab regains focus — feeds the server's primary-tab selection with a freshness signal. */
	notifyFocus(): void;
	/** Call when the editor switches which content area (main/draft) is visible. */
	notifyContentSwitch(area: 'main' | 'draft'): void;
	/** Feed a raw inbound WS frame — wire to `createWsTransport`'s `onMessage`. */
	handleMessage(raw: string): void;
	/** Called once the transport connects (including on reconnect) — sends `hello`. Wire to `createWsTransport`'s `onOpen`. */
	handleOpen(): void;
	dispose(): void;
}

export interface AgentLinkOptions {
	readonly adapter: EditorAdapter;
	readonly transport: Transport;
	readonly page: string;
	readonly serverSession: string;
	/**
	 * The main-area HTML as the editor normalized it on open, when that changed
	 * the block list loaded from disk and opening deliberately didn't save it
	 * (`client/block-structure.ts`). Reported in
	 * every `hello` until the content reaches disk (a human save, an acked op,
	 * or a `committed` frame), so the server can take it onto disk before an
	 * agent's op addresses blocks by index — see `agent/route.ts`.
	 */
	readonly normalizedHtml?: string;
	/**
	 * The hash of the file content the page was served from (`#content-hash`).
	 * Reported in `hello` so the server relays an agent's op only while this
	 * tab shows what is on disk — see `agent/tab-hub.ts`'s `syncedHash`.
	 */
	readonly contentHash?: string;
	/**
	 * Called instead of reloading when a `reload` directive arrives while the
	 * user is editing (a dialog is open, or source mode), once the edit ends —
	 * for every reason except `server-restart`, which says nothing about the
	 * page on disk and still reloads.
	 * Reloading then would also discard what was just edited, and the save of
	 * that edit is refused because the tab is behind disk — so the tab is left
	 * as it is and the caller tells the user (`create-editor.ts` shows the
	 * save-failure notice with a reload button). Without it, the tab reloads
	 * once the edit ends. A tab that is not editing always reloads right away.
	 */
	readonly onReloadDuringEdit?: () => void;
	/** Called for every `page-event` frame (a page created/deleted/renamed elsewhere) — wire to `nav-tree.ts`'s `hydrateNavTree()` and any "this page is gone" notification. */
	readonly onPageEvent?: (message: PageEventMessage) => void;
}

/**
 * @param uiState
 */
function isBusy(uiState: UIState): boolean {
	return uiState.openDialog !== null || uiState.sourceMode;
}

/**
 * Bridges the WebSocket protocol (`protocol/ws-messages.ts`) to a live
 * editor via {@link EditorAdapter} — the browser-side half of the Agent Hub
 * design. Deliberately does not import `@burger-editor/core` or touch the
 * DOM itself, so `handleMessage`'s branching (busy → nack, apply → ack,
 * reload timing) is testable with a fake adapter/transport pair instead of
 * a full editor instance.
 * @param options
 */
export function createAgentLink(options: AgentLinkOptions): AgentLink {
	const { adapter, transport } = options;
	let echoPending = false;
	let disposed = false;
	let revision = 0;
	let page = options.page;
	let normalizedHtml = options.normalizedHtml ?? null;
	let sessionId: string | null = null;
	// Not cleared after an acked op: the tab does not learn the hash of what the
	// server persisted. Keeping the older hash is the safe direction — after a
	// reconnect the tab is judged behind and reloads once, never judged in step
	// while it is behind
	let contentHash = options.contentHash ?? null;
	/** Timers / subscriptions still waiting on a UI-state change; released by `dispose()`. */
	const pendingCleanups = new Set<() => void>();

	/**
	 * @param message
	 */
	function send(message: BrowserToServerMessage): void {
		transport.send(JSON.stringify(message));
	}

	/**
	 * `processing` (an insert/move animation in flight) is a transient state
	 * a UI action set, not a hard block — wait for it to clear instead of
	 * nacking immediately, up to {@link PROCESSING_WAIT_TIMEOUT_MS}.
	 */
	function waitUntilNotProcessing(): Promise<boolean> {
		if (!adapter.getUIState().processing) {
			return Promise.resolve(true);
		}
		return new Promise((resolve) => {
			const cleanup = () => {
				clearTimeout(timer);
				unsubscribe();
				pendingCleanups.delete(cleanup);
			};
			const timer = setTimeout(() => {
				cleanup();
				resolve(false);
			}, PROCESSING_WAIT_TIMEOUT_MS);
			const unsubscribe = adapter.subscribeUIState(() => {
				if (!adapter.getUIState().processing) {
					cleanup();
					resolve(true);
				}
			});
			pendingCleanups.add(cleanup);
		});
	}

	/**
	 * Cross-realm safe error classification: the op runs against blocks that
	 * live in the editor iframe, so `instanceof RangeError` / a core error
	 * class from this bundle can be `false` for an error constructed there.
	 * Match on `name` instead.
	 * @param error
	 */
	function nackReasonFor(error: unknown): 'range' | 'disabled-block' {
		const name = error instanceof Error ? error.name : '';
		if (name === 'RangeError') {
			return 'range';
		}
		return 'disabled-block';
	}

	/**
	 * @param message
	 */
	async function handleApply(message: ApplyMessage): Promise<void> {
		browserLog(LOG_TAG, 'apply received', message);
		if (disposed) {
			return;
		}
		if (isBusy(adapter.getUIState())) {
			browserLog(
				LOG_TAG,
				'apply nacked: busy (dialog open or source mode)',
				adapter.getUIState(),
			);
			send({
				type: 'nack',
				id: message.id,
				reason: 'user-editing',
				detail: { editingBlockIndex: adapter.getUIState().editingBlockIndex },
			});
			return;
		}
		const settled = await waitUntilNotProcessing();
		if (!settled) {
			browserLog(LOG_TAG, 'apply nacked: processing-timeout');
			send({ type: 'nack', id: message.id, reason: 'processing-timeout' });
			return;
		}
		try {
			const result = await adapter.applyOp(message.op, {
				highlight: message.highlight,
				onBeforeMutate: () => {
					echoPending = true;
				},
			});
			revision = message.revision;
			normalizedHtml = null;
			browserLog(LOG_TAG, 'apply succeeded, acking', {
				id: message.id,
				revision: message.revision,
			});
			send({
				type: 'ack',
				id: message.id,
				revision: message.revision,
				html: result.html,
			});
		} catch (error) {
			echoPending = false;
			browserLog(LOG_TAG, 'apply threw, nacking', error);
			send({
				type: 'nack',
				id: message.id,
				reason: nackReasonFor(error),
				detail: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/**
	 * A `reload`/`stale` directive during an active edit would blow away
	 * unsaved dialog state — wait for idle instead of reloading mid-edit.
	 */
	/**
	 * @param reason - Why the server asked for the reload
	 */
	function reloadWhenIdle(reason: ReloadReason): void {
		if (!isBusy(adapter.getUIState())) {
			adapter.reload();
			return;
		}
		const cleanup = () => {
			unsubscribe();
			pendingCleanups.delete(cleanup);
		};
		const unsubscribe = adapter.subscribeUIState(() => {
			if (!isBusy(adapter.getUIState())) {
				cleanup();
				// A server restart says nothing about the page on disk, so the tab
				// reloads as usual; every other reason means the tab is behind disk
				if (options.onReloadDuringEdit && reason !== 'server-restart') {
					options.onReloadDuringEdit();
				} else {
					adapter.reload();
				}
			}
		});
		pendingCleanups.add(cleanup);
	}

	const unsubscribeUIState = adapter.subscribeUIState(() => {
		const uiState = adapter.getUIState();
		send({ type: 'ui-state', ...uiState });
	});

	return {
		consumeEcho() {
			if (echoPending) {
				echoPending = false;
				return true;
			}
			return false;
		},
		get sessionId() {
			return sessionId;
		},
		notifyHumanSave(savedHash) {
			normalizedHtml = null;
			if (savedHash !== undefined) {
				contentHash = savedHash;
			}
			if (!disposed) {
				send({ type: 'saved', revision });
			}
		},
		notifyPageMoved(movedTo) {
			page = movedTo;
		},
		notifyFocus() {
			if (!disposed) {
				send({ type: 'focus' });
			}
		},
		notifyContentSwitch(area) {
			if (!disposed) {
				send({ type: 'switch-content', area });
			}
		},
		handleMessage(raw) {
			let parsed: unknown;
			try {
				parsed = JSON.parse(raw);
			} catch (error) {
				browserLog(LOG_TAG, 'received frame is not valid JSON, ignoring', raw, error);
				return;
			}
			const result = serverToBrowserMessageSchema.safeParse(parsed);
			if (!result.success) {
				browserLog(
					LOG_TAG,
					'received frame failed schema validation, ignoring',
					parsed,
					result.error,
				);
				return;
			}
			const message = result.data as ServerToBrowserMessage;
			switch (message.type) {
				case 'apply': {
					void handleApply(message);
					break;
				}
				case 'welcome': {
					browserLog(LOG_TAG, 'welcome', message);
					revision = message.revision;
					sessionId = message.sessionId;
					break;
				}
				case 'reload': {
					browserLog(LOG_TAG, 'reload requested', message);
					reloadWhenIdle(message.reason);
					break;
				}
				case 'committed': {
					browserLog(LOG_TAG, message.type, message);
					normalizedHtml = null;
					break;
				}
				case 'page-event': {
					browserLog(LOG_TAG, message.type, message);
					options.onPageEvent?.(message);
					break;
				}
				case 'ping': {
					send({ type: 'pong' });
					break;
				}
			}
		},
		handleOpen() {
			// A (re)connection is a new server session; the old id is unknown to it
			sessionId = null;
			browserLog(LOG_TAG, 'connection open, sending hello', {
				page,
				revision,
				serverSession: options.serverSession,
			});
			send({
				type: 'hello',
				page,
				revision,
				serverSession: options.serverSession,
				uiState: adapter.getUIState(),
				...(normalizedHtml === null ? {} : { normalizedHtml }),
				...(contentHash === null ? {} : { contentHash }),
			});
		},
		dispose() {
			disposed = true;
			unsubscribeUIState();
			for (const cleanup of pendingCleanups) {
				cleanup();
			}
		},
	};
}
