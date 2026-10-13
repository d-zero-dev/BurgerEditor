import { describe, expect, test, vi } from 'vitest';

import { createEventLog } from './event-log.js';

describe('EventLog — append / since', () => {
	test('since(0) returns every appended event in order', () => {
		const log = createEventLog();
		log.append('session-connected', { sessionId: 'a' });
		log.append('ui-idle');
		const { events, overflowed } = log.since(0);
		expect(events.map((e) => e.type)).toEqual(['session-connected', 'ui-idle']);
		expect(overflowed).toBe(false);
	});

	test('since(cursor) returns only events after cursor', () => {
		const log = createEventLog();
		const first = log.append('session-connected');
		log.append('ui-idle');
		log.append('content-saved');
		const { events } = log.since(first.seq);
		expect(events.map((e) => e.type)).toEqual(['ui-idle', 'content-saved']);
	});

	test('assigns increasing seq numbers starting at 1', () => {
		const log = createEventLog();
		const a = log.append('session-connected');
		const b = log.append('session-disconnected');
		expect(a.seq).toBe(1);
		expect(b.seq).toBe(2);
	});

	test('stamps each event with `at` from the injected clock', () => {
		const log = createEventLog({ now: () => '2026-01-01T00:00:00.000Z' });
		const event = log.append('session-connected');
		expect(event.at).toBe('2026-01-01T00:00:00.000Z');
	});

	test('evicts the oldest event once capacity is exceeded and reports overflowed for a stale cursor', () => {
		const log = createEventLog({ capacity: 2 });
		const first = log.append('session-connected');
		log.append('session-disconnected');
		log.append('ui-idle');
		const { events, overflowed } = log.since(first.seq - 1);
		expect(events.map((e) => e.type)).toEqual(['session-disconnected', 'ui-idle']);
		expect(overflowed).toBe(true);
	});

	test('does not report overflowed for a cursor at or after the oldest retained event', () => {
		const log = createEventLog({ capacity: 2 });
		log.append('session-connected');
		const second = log.append('session-disconnected');
		log.append('ui-idle');
		const { overflowed } = log.since(second.seq);
		expect(overflowed).toBe(false);
	});
});

describe('EventLog — waitFor', () => {
	test('resolves immediately when an event is already past the cursor', async () => {
		const log = createEventLog();
		const first = log.append('session-connected');
		const result = await log.waitFor(first.seq - 1, { timeoutMs: 1000 });
		expect(result).toEqual({
			events: [first],
			overflowed: false,
			timedOut: false,
			nextCursor: first.seq,
		});
	});

	test('resolves as soon as a new event is appended', async () => {
		const log = createEventLog();
		const pending = log.waitFor(0, { timeoutMs: 1000 });
		const appended = log.append('ui-idle');
		const result = await pending;
		expect(result.timedOut).toBe(false);
		expect(result.events).toEqual([appended]);
		expect(result.nextCursor).toBe(appended.seq);
	});

	test('times out with an empty event list when nothing new arrives', async () => {
		vi.useFakeTimers();
		try {
			const log = createEventLog();
			const pending = log.waitFor(5, { timeoutMs: 50 });
			await vi.advanceTimersByTimeAsync(50);
			const result = await pending;
			expect(result).toEqual({
				events: [],
				overflowed: false,
				timedOut: true,
				nextCursor: 5,
			});
		} finally {
			vi.useRealTimers();
		}
	});

	test('filters by types, ignoring non-matching events until a matching one arrives', async () => {
		const log = createEventLog();
		const pending = log.waitFor(0, { timeoutMs: 1000, types: ['content-saved'] });
		log.append('ui-idle');
		const saved = log.append('content-saved');
		const result = await pending;
		expect(result.events).toEqual([saved]);
		expect(result.nextCursor).toBe(saved.seq);
	});

	test('resolves early when the signal aborts', async () => {
		const log = createEventLog();
		const controller = new AbortController();
		const pending = log.waitFor(3, { timeoutMs: 10_000, signal: controller.signal });
		controller.abort();
		const result = await pending;
		expect(result).toEqual({
			events: [],
			overflowed: false,
			timedOut: true,
			nextCursor: 3,
		});
	});

	test('resolves immediately as a timeout when the signal is already aborted', async () => {
		const log = createEventLog();
		const controller = new AbortController();
		controller.abort();
		const result = await log.waitFor(3, { timeoutMs: 10_000, signal: controller.signal });
		expect(result).toEqual({
			events: [],
			overflowed: false,
			timedOut: true,
			nextCursor: 3,
		});
	});

	test('resolves with overflowed when the cursor is stale, even with no matching events', async () => {
		const log = createEventLog({ capacity: 1 });
		const first = log.append('session-connected');
		log.append('session-disconnected');
		const result = await log.waitFor(0, { timeoutMs: 1000, types: ['content-saved'] });
		// Advances only to `droppedUpTo` (the evicted event's seq), not past
		// the still-retained (but non-matching) second event — the minimal
		// safe cursor, so a later call with a different `types` filter still
		// sees that second event instead of it being skipped unnecessarily.
		expect(result).toEqual({
			events: [],
			overflowed: true,
			timedOut: false,
			nextCursor: first.seq,
		});
	});

	test('a stale, non-matching overflowed cursor advances past the gap instead of repeating forever', async () => {
		const log = createEventLog({ capacity: 1 });
		log.append('session-connected');
		log.append('session-disconnected');
		const first = await log.waitFor(0, { timeoutMs: 1000, types: ['content-saved'] });
		expect(first.overflowed).toBe(true);
		expect(first.nextCursor).not.toBe(0);

		// A second call with the advanced cursor must NOT still be overflowed —
		// otherwise a caller looping `since: nextCursor` would never progress.
		const second = await log.waitFor(first.nextCursor, {
			timeoutMs: 50,
			types: ['content-saved'],
		});
		expect(second.overflowed).toBe(false);
	});
});
