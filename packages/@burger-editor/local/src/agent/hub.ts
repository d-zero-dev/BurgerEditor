import { randomUUID } from 'node:crypto';

import { log } from '../helpers/debug.js';
import { browserToServerMessageSchema } from '../protocol/ws-messages.js';

import { RevisionRegistry } from './revision-registry.js';
import { TabHub } from './tab-hub.js';

export interface AgentHubOptions {
	/** Forwarded to `TabHub` — see its doc comment for why a `hello`'s `page` needs this. Defaults to `'index.html'`. */
	readonly indexFileName?: string;
	/** Milliseconds between `ping` broadcasts. Defaults to 30000. */
	readonly pingIntervalMs?: number;
	readonly now?: () => number;
}

/**
 * Bundles the pieces `agent/route.ts` needs to serve `/ws/editor` and
 * `/api/agent/*`: the `TabHub` (live browser connections), the
 * `RevisionRegistry` (per-page disk state), and a per-launch
 * `serverSession` token a reconnecting/stale tab's `hello` is checked
 * against (see `TabHub.hello`).
 */
export interface AgentHub {
	readonly tabHub: TabHub;
	readonly revisions: RevisionRegistry;
	readonly serverSession: string;
	/**
	 * Parse and dispatch one raw WebSocket text frame from `sessionId` to the
	 * matching `TabHub` method. Malformed or unrecognized frames are dropped
	 * silently — a stale client sending an old message shape shouldn't crash
	 * the server it's connected to.
	 * @param sessionId
	 * @param raw
	 */
	handleSocketMessage(sessionId: string, raw: string): void;
	dispose(): void;
}

/**
 * @param options
 */
export function createAgentHub(options: AgentHubOptions = {}): AgentHub {
	const serverSession = randomUUID();
	const tabHub = new TabHub({
		serverSession,
		now: options.now,
		indexFileName: options.indexFileName,
	});
	const revisions = new RevisionRegistry();
	const pingIntervalMs = options.pingIntervalMs ?? 30_000;
	const timer = setInterval(() => tabHub.pingAll(), pingIntervalMs);

	return {
		tabHub,
		revisions,
		serverSession,
		handleSocketMessage(sessionId, raw) {
			let parsed: unknown;
			try {
				parsed = JSON.parse(raw);
			} catch (error) {
				log(
					'socket %s sent a frame that is not valid JSON: %o (%o)',
					sessionId,
					raw,
					error,
				);
				return;
			}
			const result = browserToServerMessageSchema.safeParse(parsed);
			if (!result.success) {
				log(
					'socket %s sent a frame that failed schema validation: %o (%o)',
					sessionId,
					parsed,
					result.error,
				);
				return;
			}
			const message = result.data;
			log('socket %s -> %s: %o', sessionId, message.type, message);
			switch (message.type) {
				case 'hello': {
					tabHub.hello(sessionId, message);
					break;
				}
				case 'focus': {
					tabHub.touch(sessionId);
					break;
				}
				case 'ui-state': {
					tabHub.setUIState(sessionId, {
						openDialog: message.openDialog,
						sourceMode: message.sourceMode,
						processing: message.processing,
						editingBlockIndex: message.editingBlockIndex,
					});
					break;
				}
				case 'ack': {
					tabHub.resolveAck(sessionId, message.id, message.revision, message.html);
					break;
				}
				case 'nack': {
					tabHub.resolveNack(sessionId, message.id, message.reason, message.detail);
					break;
				}
				case 'saved':
				case 'switch-content':
				case 'pong': {
					tabHub.touch(sessionId);
					break;
				}
			}
		},
		dispose() {
			clearInterval(timer);
			tabHub.dispose();
		},
	};
}
