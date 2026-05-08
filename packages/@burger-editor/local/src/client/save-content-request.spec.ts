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

// `saveContentRequest`'s `post` parameter is typed against the Hono client's
// $post; the test feeds it a structurally compatible mock and casts at the
// call site. The cast is narrowed inside the function via runtime checks, so
// the test still exercises the real branching logic.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPost = any;

describe('saveContentRequest', () => {
	test('on 200 + { saved: true } it calls log.info with the saved path', async () => {
		const post = vi.fn().mockResolvedValue(
			jsonResponse({
				saved: true,
				path: '/tmp/docs/about.html',
				hasFrontMatter: false,
			}),
		);
		const log = makeLog();

		await saveContentRequest(
			post as AnyPost,
			{ path: '/about.html', content: '<h1>About</h1>' },
			log,
		);

		expect(log.info).toHaveBeenCalledOnce();
		expect(log.info.mock.calls[0]?.[0]).toBe('Saved: /tmp/docs/about.html');
		expect(log.error).not.toHaveBeenCalled();
	});

	test('on 200 + { saved: true, hasFrontMatter: true } the info message includes the FM marker', async () => {
		const post = vi.fn().mockResolvedValue(
			jsonResponse({
				saved: true,
				path: '/tmp/docs/about.html',
				hasFrontMatter: true,
			}),
		);
		const log = makeLog();

		await saveContentRequest(
			post as AnyPost,
			{ path: '/about.html', content: '<h1>About</h1>' },
			log,
		);

		expect(log.info.mock.calls[0]?.[0]).toBe(
			'Saved: /tmp/docs/about.html (with Front Matter)',
		);
	});

	test('on 4xx + { error } it calls log.error with the structured server message (regression: #753)', async () => {
		const post = vi
			.fn()
			.mockResolvedValue(
				jsonResponse({ error: 'Unknown logical path: /missing.html' }, { status: 404 }),
			);
		const log = makeLog();

		await saveContentRequest(
			post as AnyPost,
			{ path: '/missing.html', content: '<h1/>' },
			log,
		);

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
		const post = vi.fn().mockResolvedValue(broken);
		const log = makeLog();

		await saveContentRequest(post as AnyPost, { path: '/x.html', content: '<h1/>' }, log);

		expect(log.error).toHaveBeenCalledOnce();
		expect(log.error.mock.calls[0]?.[0]).toBe('Failed to save: Internal Server Error');
		expect(log.info).not.toHaveBeenCalled();
	});

	test('on 200 + { saved: false } it calls log.error with "Save did not complete"', async () => {
		const post = vi
			.fn()
			.mockResolvedValue(jsonResponse({ saved: false, path: '/x.html' }));
		const log = makeLog();

		await saveContentRequest(post as AnyPost, { path: '/x.html', content: '<h1/>' }, log);

		expect(log.error).toHaveBeenCalledWith('Save did not complete');
		expect(log.info).not.toHaveBeenCalled();
	});

	test('on 200 + body missing the `saved` field it calls log.error with "Save did not complete"', async () => {
		const post = vi.fn().mockResolvedValue(jsonResponse({ message: 'unexpected shape' }));
		const log = makeLog();

		await saveContentRequest(post as AnyPost, { path: '/x.html', content: '<h1/>' }, log);

		expect(log.error).toHaveBeenCalledWith('Save did not complete');
		expect(log.info).not.toHaveBeenCalled();
	});

	test('forwards path / content / frontMatter / originalFrontMatter unchanged to the post body', async () => {
		const post = vi.fn().mockResolvedValue(
			jsonResponse({
				saved: true,
				path: '/tmp/docs/x.html',
				hasFrontMatter: true,
			}),
		);
		const log = makeLog();

		await saveContentRequest(
			post as AnyPost,
			{
				path: '/x.html',
				content: '<h1>X</h1>',
				frontMatter: { title: 'X' },
				originalFrontMatter: 'title: old',
			},
			log,
		);

		expect(post).toHaveBeenCalledOnce();
		expect(post.mock.calls[0]?.[0]).toEqual({
			json: {
				path: '/x.html',
				content: '<h1>X</h1>',
				frontMatter: { title: 'X' },
				originalFrontMatter: 'title: old',
			},
		});
	});
});
