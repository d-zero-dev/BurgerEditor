/**
 * The event types `agent/hub.ts`, `agent/route.ts`, and `agent/fs-watcher.ts`
 * append to an {@link EventLog}. A runtime array (not just a type) so
 * `agent/route.ts`'s `GET /api/agent/events` can validate an incoming
 * `?types=` query against it, alongside giving `editor_wait_for_event`'s
 * `types` filter and this module's own tests a single source of truth to
 * catch a typo'd event name at compile time.
 */
export const AGENT_EVENT_TYPES = [
	'session-connected',
	'session-disconnected',
	'ui-state',
	'ui-idle',
	'content-saved',
	'content-changed',
	'front-matter-changed',
	'page-created',
	'page-deleted',
	'page-renamed',
] as const;

export type AgentEventType = (typeof AGENT_EVENT_TYPES)[number];

export interface AgentEvent {
	readonly seq: number;
	readonly type: AgentEventType;
	/** Same ISO format as `agent/route.ts`'s `nowIso()`, so a caller can correlate an event against a JSON response's own `timestamp`. */
	readonly at: string;
	readonly payload: Record<string, unknown>;
}

export interface EventLogSince {
	readonly events: readonly AgentEvent[];
	/** `true` when an event older than the oldest one still retained may have matched `since`'s cursor — the ring buffer evicted it before this call. */
	readonly overflowed: boolean;
}

export interface EventLogWait extends EventLogSince {
	/** `true` when `waitFor` returned because `timeoutMs` elapsed (or `signal` aborted) with nothing new, not because an event arrived. */
	readonly timedOut: boolean;
	/**
	 * The `cursor` to pass as `since` on the next call. Always safe to resume
	 * from — in particular, an `overflowed` response whose `types` filter
	 * matched none of the events still in the buffer would otherwise leave a
	 * caller's cursor unchanged (nothing in `events` to read a `seq` off of)
	 * and stuck below the buffer's retention window forever, repeating the
	 * same `overflowed: true` reply on every subsequent call.
	 */
	readonly nextCursor: number;
}

export interface WaitForOptions {
	/** Only resolve for events whose `type` is in this list. Omitted means every type. */
	readonly types?: readonly AgentEventType[];
	readonly timeoutMs: number;
	/** Resolve immediately (as a timeout) when this aborts — lets a caller stop waiting when its own request disconnects. */
	readonly signal?: AbortSignal;
}

export interface EventLog {
	append(type: AgentEventType, payload?: Record<string, unknown>): AgentEvent;
	since(cursor: number): EventLogSince;
	waitFor(cursor: number, options: WaitForOptions): Promise<EventLogWait>;
}

export interface EventLogOptions {
	/** Maximum retained events before the oldest is evicted. Defaults to 500. */
	readonly capacity?: number;
	readonly now?: () => string;
}

/**
 * An in-memory ring buffer of {@link AgentEvent}s plus a long-poll
 * (`waitFor`) over it — the backing store for `GET /api/agent/events` and
 * `editor_wait_for_event`. Deliberately process-local: a restarted `local`
 * process loses history, which is fine because a `hello`'s `serverSession`
 * mismatch already forces every tab to reload on restart (`tab-hub.ts`), so
 * nothing meaningful survives a restart for a caller to have missed anyway.
 * @param options
 */
export function createEventLog(options: EventLogOptions = {}): EventLog {
	const capacity = options.capacity ?? 500;
	const now = options.now ?? (() => new Date().toISOString());
	const events: AgentEvent[] = [];
	const waiters = new Set<() => void>();
	let seq = 0;
	// The seq of the most recently evicted event, or 0 if nothing has been
	// evicted yet — `since`/`waitFor` compare a caller's cursor against this
	// to report `overflowed` instead of silently returning an incomplete list.
	let droppedUpTo = 0;

	/**
	 *
	 * @param type
	 * @param payload
	 */
	function append(
		type: AgentEventType,
		payload: Record<string, unknown> = {},
	): AgentEvent {
		seq += 1;
		const event: AgentEvent = { seq, type, at: now(), payload };
		events.push(event);
		if (events.length > capacity) {
			const evicted = events.shift();
			if (evicted) {
				droppedUpTo = evicted.seq;
			}
		}
		for (const wake of waiters) {
			wake();
		}
		return event;
	}

	/**
	 *
	 * @param cursor
	 */
	function since(cursor: number): EventLogSince {
		return {
			events: events.filter((event) => event.seq > cursor),
			overflowed: cursor < droppedUpTo,
		};
	}

	/**
	 *
	 * @param cursor
	 * @param waitOptions
	 */
	function waitFor(cursor: number, waitOptions: WaitForOptions): Promise<EventLogWait> {
		const matchesType = (event: AgentEvent) =>
			!waitOptions.types || waitOptions.types.includes(event.type);
		const check = (): EventLogWait | null => {
			const result = since(cursor);
			const matching = result.events.filter(matchesType);
			if (matching.length === 0 && !result.overflowed) {
				return null;
			}
			// Advance to the last matching event's seq when there is one;
			// otherwise (an overflowed response with nothing matching the
			// `types` filter) advance past the gap to `droppedUpTo` so the
			// caller's next `since` isn't stuck below the retention window.
			const nextCursor = matching.at(-1)?.seq ?? Math.max(cursor, droppedUpTo);
			return {
				events: matching,
				overflowed: result.overflowed,
				timedOut: false,
				nextCursor,
			};
		};

		const immediate = check();
		if (immediate) {
			return Promise.resolve(immediate);
		}
		if (waitOptions.signal?.aborted) {
			return Promise.resolve({
				events: [],
				overflowed: false,
				timedOut: true,
				nextCursor: cursor,
			});
		}

		return new Promise((resolve) => {
			let settled = false;
			const finish = (result: EventLogWait) => {
				if (settled) {
					return;
				}
				settled = true;
				waiters.delete(wake);
				clearTimeout(timer);
				waitOptions.signal?.removeEventListener('abort', onAbort);
				resolve(result);
			};
			const wake = () => {
				const result = check();
				if (result) {
					finish(result);
				}
			};
			const onAbort = () =>
				finish({ events: [], overflowed: false, timedOut: true, nextCursor: cursor });
			const timer = setTimeout(
				() =>
					finish({ events: [], overflowed: false, timedOut: true, nextCursor: cursor }),
				waitOptions.timeoutMs,
			);
			waiters.add(wake);
			waitOptions.signal?.addEventListener('abort', onAbort);
		});
	}

	return { append, since, waitFor };
}
