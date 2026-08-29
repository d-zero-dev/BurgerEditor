import type { EventLog } from './event-log.js';

import { randomUUID } from 'node:crypto';

import { log } from '../helpers/debug.js';
import { browserToServerMessageSchema } from '../protocol/ws-messages.js';

import { createEventLog } from './event-log.js';
import { RevisionRegistry } from './revision-registry.js';
import { isIdle, TabHub } from './tab-hub.js';

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
	readonly events: EventLog;
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
	/**
	 * A tab's `/ws/editor` socket closed — disconnects it from `tabHub` and
	 * appends `session-disconnected` to `events`. `route.tsx`'s `onClose`
	 * calls this instead of `tabHub.disconnect` directly so the two never
	 * drift apart.
	 * @param sessionId
	 */
	closeSession(sessionId: string): void;
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
	const events = createEventLog();
	const pingIntervalMs = options.pingIntervalMs ?? 30_000;
	const timer = setInterval(() => {
		for (const disconnected of tabHub.pingAll()) {
			events.append('session-disconnected', {
				sessionId: disconnected.id,
				page: disconnected.page,
			});
		}
	}, pingIntervalMs);

	return {
		tabHub,
		revisions,
		events,
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
					const outcome = tabHub.hello(sessionId, message);
					if (outcome === 'accepted') {
						events.append('session-connected', { sessionId, page: message.page });
					}
					break;
				}
				case 'focus': {
					tabHub.touch(sessionId);
					break;
				}
				case 'ui-state': {
					// A frame for a session already gone (disconnected between send
					// and receipt, a ping-detected crash, …) must not append a
					// ghost `ui-state`/`ui-idle` with no matching
					// `session-connected` — `tabHub.setUIState` itself already
					// no-ops on an unknown sessionId, but silently, so check first.
					const existing = tabHub.get(sessionId);
					if (!existing) {
						break;
					}
					const wasIdle = isIdle(existing.uiState);
					const nextUiState = {
						openDialog: message.openDialog,
						sourceMode: message.sourceMode,
						processing: message.processing,
						editingBlockIndex: message.editingBlockIndex,
					};
					tabHub.setUIState(sessionId, nextUiState);
					events.append('ui-state', { sessionId, uiState: nextUiState });
					if (!wasIdle && isIdle(nextUiState)) {
						events.append('ui-idle', { sessionId });
					}
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
		closeSession(sessionId) {
			const snapshot = tabHub.get(sessionId);
			tabHub.disconnect(sessionId);
			if (snapshot) {
				events.append('session-disconnected', { sessionId, page: snapshot.page });
			}
		},
		dispose() {
			clearInterval(timer);
			tabHub.dispose();
		},
	};
}
