import type {
	ApplyMessage,
	BlockOp,
	BrowserToServerMessage,
	ServerToBrowserMessage,
	UIState,
} from '../protocol/ws-messages.js';

import { serverToBrowserMessageSchema } from '../protocol/ws-messages.js';

const PROCESSING_WAIT_TIMEOUT_MS = 2000;

/**
 * What `agent-link.ts` needs from a live editor, narrowed to exactly the
 * operations this feature touches — kept separate from
 * `client/engine-adapter.ts` (the real `BurgerEditorEngine`-backed
 * implementation) so this file's decision logic can be tested against a
 * fake instead of a full editor instance.
 */
export interface EditorAdapter {
	getUIState(): UIState;
	applyOp(op: BlockOp, options: { highlight: boolean }): Promise<{ html: string }>;
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
	/** Call when the editor saves for a reason other than an agent-applied op (a human edit). */
	notifyHumanSave(): void;
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
			const timer = setTimeout(() => {
				unsubscribe();
				resolve(false);
			}, PROCESSING_WAIT_TIMEOUT_MS);
			const unsubscribe = adapter.subscribeUIState(() => {
				if (!adapter.getUIState().processing) {
					clearTimeout(timer);
					unsubscribe();
					resolve(true);
				}
			});
		});
	}

	/**
	 * @param message
	 */
	async function handleApply(message: ApplyMessage): Promise<void> {
		if (isBusy(adapter.getUIState())) {
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
			send({ type: 'nack', id: message.id, reason: 'processing-timeout' });
			return;
		}
		try {
			echoPending = true;
			const result = await adapter.applyOp(message.op, { highlight: message.highlight });
			revision = message.revision;
			send({
				type: 'ack',
				id: message.id,
				revision: message.revision,
				html: result.html,
			});
		} catch (error) {
			echoPending = false;
			send({
				type: 'nack',
				id: message.id,
				reason: error instanceof RangeError ? 'range' : 'disabled-block',
				detail: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/**
	 * A `reload`/`stale` directive during an active edit would blow away
	 * unsaved dialog state — wait for idle instead of reloading mid-edit.
	 */
	function reloadWhenIdle(): void {
		if (!isBusy(adapter.getUIState())) {
			adapter.reload();
			return;
		}
		const unsubscribe = adapter.subscribeUIState(() => {
			if (!isBusy(adapter.getUIState())) {
				unsubscribe();
				adapter.reload();
			}
		});
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
		notifyHumanSave() {
			if (!disposed) {
				send({ type: 'saved', revision });
			}
		},
		handleMessage(raw) {
			let parsed: unknown;
			try {
				parsed = JSON.parse(raw);
			} catch {
				return;
			}
			const result = serverToBrowserMessageSchema.safeParse(parsed);
			if (!result.success) {
				return;
			}
			const message = result.data as ServerToBrowserMessage;
			switch (message.type) {
				case 'apply': {
					void handleApply(message);
					break;
				}
				case 'welcome': {
					revision = message.revision;
					break;
				}
				case 'reload': {
					reloadWhenIdle();
					break;
				}
				case 'committed':
				case 'page-event': {
					break;
				}
				case 'ping': {
					send({ type: 'pong' });
					break;
				}
			}
		},
		handleOpen() {
			send({
				type: 'hello',
				page: options.page,
				revision,
				serverSession: options.serverSession,
				uiState: adapter.getUIState(),
			});
		},
		dispose() {
			disposed = true;
			unsubscribeUIState();
		},
	};
}
