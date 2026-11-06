import type { SaveContentParams } from './save-content-request.js';

import { describe, expect, test, vi } from 'vitest';

import { saveContentRequest } from './save-content-request.js';

/**
 * Build a fake `Response` with the given JSON body and status. We model only
 * the surface that {@link saveContentRequest} touches: `ok`, `statusText`, and
 * `json()`.
 * @param body
 * @param init
 */
function jsonResponse(body: unknown, init: ResponseInit = {}) {
	return Response.json(body, {
		status: init.status ?? 200,
		statusText: init.statusText ?? '',
		headers: { 'content-type': 'application/json' },
	});
}

/**
 *
 */
function makeLog() {
	return {
		info: vi.fn<(message: string) => void>(),
		error: vi.fn<(message: string) => void>(),
	};
}

/**
 * Minimal structural shape of `client.api.content.$post` used by
 * {@link saveContentRequest}. Typing the test mock against this — instead of
 * widening to `any` — keeps the JSON body shape checked at test-write time so
 * a future schema change to `apiSchema` would surface in `vi.fn<FakePost>()`.
 */
type FakePost = (args: { json: SaveContentParams }) => Promise<Response>;

/**
 * Cast back to the helper's first-parameter type. We cross through `unknown`
 * because Hono's $post carries route-type baggage (`ClientResponse<...>`,
 * status codes, header phantom types) that the runtime doesn't care about
 * but the TS structural check does.
 */
type SaveContentPost = Parameters<typeof saveContentRequest>[0];

describe('saveContentRequest', () => {
	test('on 200 + { saved: true } it calls log.info with the saved path', async () => {
		const post = vi.fn<FakePost>().mockResolvedValue(
			jsonResponse({
				saved: true,
				path: '/tmp/docs/about.html',
				hasFrontMatter: false,
			}),
		);
		const log = makeLog();

		const saved = await saveContentRequest(
			post as unknown as SaveContentPost,
			{ path: '/about.html', content: '<h1>About</h1>' },
			log,
		);

		expect(saved).toBe(true);
		expect(log.info).toHaveBeenCalledOnce();
		expect(log.info.mock.calls[0]?.[0]).toBe('Saved: /tmp/docs/about.html');
		expect(log.error).not.toHaveBeenCalled();
	});

	test('on 200 + { saved: true, hasFrontMatter: true } the info message includes the FM marker', async () => {
		const post = vi.fn<FakePost>().mockResolvedValue(
			jsonResponse({
				saved: true,
				path: '/tmp/docs/about.html',
				hasFrontMatter: true,
			}),
		);
		const log = makeLog();

		await saveContentRequest(
			post as unknown as SaveContentPost,
			{ path: '/about.html', content: '<h1>About</h1>' },
			log,
		);

		expect(log.info.mock.calls[0]?.[0]).toBe(
			'Saved: /tmp/docs/about.html (with Front Matter)',
		);
	});

	test('on 4xx + { error } it calls log.error with the structured server message (regression: #753)', async () => {
		const post = vi
			.fn<FakePost>()
			.mockResolvedValue(
				jsonResponse({ error: 'Unknown logical path: /missing.html' }, { status: 404 }),
			);
		const log = makeLog();

		const saved = await saveContentRequest(
			post as unknown as SaveContentPost,
			{ path: '/missing.html', content: '<h1/>' },
			log,
		);

		expect(saved).toBe(false);
		expect(log.error).toHaveBeenCalledOnce();
		expect(log.error.mock.calls[0]?.[0]).toBe(
			'Failed to save: Unknown logical path: /missing.html',
		);
		expect(log.info).not.toHaveBeenCalled();
	});

	test('on 4xx + invalid JSON it falls back to res.statusText (regression: #753)', async () => {
		const broken = new Response('not json at all', {
			status: 500,
			statusText: 'Internal Server Error',
			headers: { 'content-type': 'application/json' },
		});
		const post = vi.fn<FakePost>().mockResolvedValue(broken);
		const log = makeLog();

		await saveContentRequest(
			post as unknown as SaveContentPost,
			{ path: '/x.html', content: '<h1/>' },
			log,
		);

		expect(log.error).toHaveBeenCalledOnce();
		expect(log.error.mock.calls[0]?.[0]).toBe('Failed to save: Internal Server Error');
		expect(log.info).not.toHaveBeenCalled();
	});

	test('on 200 + { saved: false } it calls log.error with "Save did not complete"', async () => {
		const post = vi
			.fn<FakePost>()
			.mockResolvedValue(jsonResponse({ saved: false, path: '/x.html' }));
		const log = makeLog();

		const saved = await saveContentRequest(
			post as unknown as SaveContentPost,
			{ path: '/x.html', content: '<h1/>' },
			log,
		);

		expect(saved).toBe(false);
		expect(log.error).toHaveBeenCalledWith('Save did not complete');
		expect(log.info).not.toHaveBeenCalled();
	});

	test('on 200 + body missing the `saved` field it calls log.error with "Save did not complete"', async () => {
		const post = vi
			.fn<FakePost>()
			.mockResolvedValue(jsonResponse({ message: 'unexpected shape' }));
		const log = makeLog();

		await saveContentRequest(
			post as unknown as SaveContentPost,
			{ path: '/x.html', content: '<h1/>' },
			log,
		);

		expect(log.error).toHaveBeenCalledWith('Save did not complete');
		expect(log.info).not.toHaveBeenCalled();
	});

	test('forwards path / content / frontMatter / originalFrontMatter / createIfMissing unchanged to the post body', async () => {
		const post = vi.fn<FakePost>().mockResolvedValue(
			jsonResponse({
				saved: true,
				path: '/tmp/docs/x.html',
				hasFrontMatter: true,
			}),
		);
		const log = makeLog();

		await saveContentRequest(
			post as unknown as SaveContentPost,
			{
				path: '/x.html',
				content: '<h1>X</h1>',
				frontMatter: { title: 'X' },
				originalFrontMatter: 'title: old',
				createIfMissing: true,
			},
			log,
		);

		expect(post).toHaveBeenCalledOnce();
		expect(post.mock.calls[0]?.[0]).toStrictEqual({
			json: {
				path: '/x.html',
				content: '<h1>X</h1>',
				frontMatter: { title: 'X' },
				originalFrontMatter: 'title: old',
				createIfMissing: true,
			},
		});
	});
});

describe('saveContentRequest — the saving tab', () => {
	test('sends sessionId only when it is given', async () => {
		const post = vi
			.fn<FakePost>()
			.mockResolvedValue(
				jsonResponse({ saved: true, path: '/x', hasFrontMatter: false }),
			);

		await saveContentRequest(
			post as unknown as SaveContentPost,
			{ path: '/x.html', content: '<p>x</p>', sessionId: 'tab-1' },
			makeLog(),
		);

		expect(post.mock.calls[0]?.[0]).toStrictEqual({
			json: {
				path: '/x.html',
				content: '<p>x</p>',
				frontMatter: undefined,
				originalFrontMatter: undefined,
				createIfMissing: undefined,
				sessionId: 'tab-1',
			},
		});
	});

	test('reports the contentHash of what was written to onSaved', async () => {
		const post = vi.fn<FakePost>().mockResolvedValue(
			jsonResponse({
				saved: true,
				path: '/x',
				hasFrontMatter: false,
				contentHash: 'h2',
			}),
		);
		const onSaved = vi.fn();

		const saved = await saveContentRequest(
			post as unknown as SaveContentPost,
			{ path: '/x.html', content: '<p>x</p>' },
			makeLog(),
			{ onSaved },
		);

		expect(saved).toBe(true);
		expect(onSaved).toHaveBeenCalledWith({ contentHash: 'h2', logicalPath: undefined });
	});

	test('reports an undefined contentHash when the server sends none, and does not call onSaved on a failure', async () => {
		const onSaved = vi.fn();
		const ok = vi
			.fn<FakePost>()
			.mockResolvedValue(
				jsonResponse({ saved: true, path: '/x', hasFrontMatter: false }),
			);
		const failing = vi
			.fn<FakePost>()
			.mockResolvedValue(jsonResponse({ error: 'no' }, { status: 400 }));

		await saveContentRequest(
			ok as unknown as SaveContentPost,
			{ path: '/x.html', content: '' },
			makeLog(),
			{ onSaved },
		);
		await saveContentRequest(
			failing as unknown as SaveContentPost,
			{ path: '/x.html', content: '' },
			makeLog(),
			{ onSaved },
		);

		expect(onSaved.mock.calls).toEqual([
			[{ contentHash: undefined, logicalPath: undefined }],
		]);
	});
});

describe('saveContentRequest — a save that did not reach disk', () => {
	test.each([
		[
			'a 409 conflict',
			'conflict',
			jsonResponse({ error: 'conflict', message: 'x' }, { status: 409 }),
		],
		[
			'a 404',
			'not-found',
			jsonResponse({ error: 'Unknown logical path: /a.html' }, { status: 404 }),
		],
		[
			'a 409 for a path another page uses',
			'path-taken',
			jsonResponse({ error: 'Logical path "/a.html" is already used' }, { status: 409 }),
		],
		['a 500', 'failed', jsonResponse({}, { status: 500 })],
		['a 200 that did not save', 'failed', jsonResponse({ saved: false })],
	] as const)(
		'%s calls onFailed with %s, returns false and does not call onSaved',
		async (_label, reason, response) => {
			const post = vi.fn<FakePost>().mockResolvedValue(response);
			const onSaved = vi.fn();
			const onFailed = vi.fn();

			const saved = await saveContentRequest(
				post as unknown as SaveContentPost,
				{ path: '/x.html', content: '' },
				makeLog(),
				{ onSaved, onFailed },
			);

			expect(saved).toBe(false);
			expect(onFailed.mock.calls).toEqual([[reason]]);
			expect(onSaved).not.toHaveBeenCalled();
		},
	);

	test('a request that cannot reach the server calls onFailed("failed") and returns false instead of throwing', async () => {
		const post = vi.fn<FakePost>().mockRejectedValue(new TypeError('Failed to fetch'));
		const onFailed = vi.fn();
		const log = makeLog();

		const saved = await saveContentRequest(
			post as unknown as SaveContentPost,
			{ path: '/x.html', content: '' },
			log,
			{ onFailed },
		);

		expect(saved).toBe(false);
		expect(onFailed.mock.calls).toEqual([['failed']]);
		expect(log.error).toHaveBeenCalledOnce();
	});

	test('sends baseHash only when it is given', async () => {
		const post = vi
			.fn<FakePost>()
			.mockResolvedValue(
				jsonResponse({ saved: true, path: '/x', hasFrontMatter: false }),
			);

		await saveContentRequest(
			post as unknown as SaveContentPost,
			{ path: '/x.html', content: '', baseHash: 'h1' },
			makeLog(),
		);

		expect(post.mock.calls[0]?.[0]).toMatchObject({ json: { baseHash: 'h1' } });
	});
});

describe('saveContentRequest — the page path after the save', () => {
	test('reports the logicalPath the server answered to onSaved', async () => {
		const post = vi.fn<FakePost>().mockResolvedValue(
			jsonResponse({
				saved: true,
				path: '/x',
				hasFrontMatter: true,
				contentHash: 'h2',
				logicalPath: '/company/about.html',
			}),
		);
		const onSaved = vi.fn();

		await saveContentRequest(
			post as unknown as SaveContentPost,
			{ path: '/about.html', content: '' },
			makeLog(),
			{ onSaved },
		);

		expect(onSaved).toHaveBeenCalledWith({
			contentHash: 'h2',
			logicalPath: '/company/about.html',
		});
	});
});
