import type { PageSaverOptions } from './page-saver.js';

import { describe, expect, test, vi } from 'vitest';

import { createPageSaver } from './page-saver.js';

/**
 * @param body
 * @param status
 */
function jsonResponse(body: unknown, status = 200) {
	return Response.json(body, { status, headers: { 'content-type': 'application/json' } });
}

/**
 * @param overrides
 */
function options(overrides: Partial<PageSaverOptions> = {}) {
	return {
		post: vi.fn(),
		baseHash: 'h0',
		indexFileName: 'index.html',
		getPathname: () => '/about.html',
		getSessionId: () => null,
		createIfMissing: () => false,
		onSaveResult: vi.fn(),
		onHumanSave: vi.fn(),
		showFailure: vi.fn(),
		clearFailure: vi.fn(),
		followMovedPage: vi.fn(),
		log: { info: vi.fn(), error: vi.fn() },
		...overrides,
	} satisfies PageSaverOptions;
}

/**
 * @param post
 * @param index
 */
function bodyOf(post: ReturnType<typeof vi.fn>, index: number) {
	return (post.mock.calls[index]?.[0] as { json: Record<string, unknown> }).json;
}

describe('createPageSaver', () => {
	test('sends the served hash first, then the hash each save wrote', async () => {
		const post = vi
			.fn()
			.mockResolvedValueOnce(
				jsonResponse({
					saved: true,
					path: '/x',
					hasFrontMatter: false,
					contentHash: 'h1',
				}),
			)
			.mockResolvedValueOnce(
				jsonResponse({
					saved: true,
					path: '/x',
					hasFrontMatter: false,
					contentHash: 'h2',
				}),
			);
		const saver = createPageSaver(options({ post }));

		await saver.save('<p>1</p>');
		await saver.save('<p>2</p>');

		expect(bodyOf(post, 0)).toMatchObject({ path: '/about.html', baseHash: 'h0' });
		expect(bodyOf(post, 1)).toMatchObject({ baseHash: 'h1' });
	});

	test('saves started back to back are sent one after another, each with the hash the previous one wrote', async () => {
		let resolveFirst: (response: Response) => void = () => {};
		const post = vi
			.fn()
			.mockReturnValueOnce(
				new Promise<Response>((resolve) => {
					resolveFirst = resolve;
				}),
			)
			.mockResolvedValueOnce(
				jsonResponse({
					saved: true,
					path: '/x',
					hasFrontMatter: false,
					contentHash: 'h2',
				}),
			);
		const saver = createPageSaver(options({ post }));

		const first = saver.save('<p>1</p>');
		const second = saver.save('<p>2</p>');
		await Promise.resolve();
		expect(post).toHaveBeenCalledOnce();
		resolveFirst(
			jsonResponse({ saved: true, path: '/x', hasFrontMatter: false, contentHash: 'h1' }),
		);
		await Promise.all([first, second]);

		expect(bodyOf(post, 1)).toMatchObject({ baseHash: 'h1' });
	});

	test('sends the tab session when the agent hub has one', async () => {
		const post = vi
			.fn()
			.mockResolvedValue(
				jsonResponse({ saved: true, path: '/x', hasFrontMatter: false }),
			);
		const saver = createPageSaver(options({ post, getSessionId: () => 'tab-1' }));

		await saver.save('<p>1</p>');

		expect(bodyOf(post, 0)).toMatchObject({ sessionId: 'tab-1' });
	});

	test('a confirmed save clears the failure notice and reports the written hash to the agent hub', async () => {
		const post = vi.fn().mockResolvedValue(
			jsonResponse({
				saved: true,
				path: '/x',
				hasFrontMatter: false,
				contentHash: 'h1',
			}),
		);
		const opts = options({ post });
		const saver = createPageSaver(opts);

		expect(await saver.save('<p>1</p>')).toBe(true);

		expect(opts.clearFailure).toHaveBeenCalledOnce();
		expect(opts.onHumanSave).toHaveBeenCalledWith('h1');
		expect(opts.onSaveResult).toHaveBeenCalledWith(true);
		expect(opts.followMovedPage).not.toHaveBeenCalled();
	});

	test('a failed save shows the notice with its reason and keeps the base hash', async () => {
		const post = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse({ error: 'conflict' }, 409))
			.mockResolvedValueOnce(
				jsonResponse({ saved: true, path: '/x', hasFrontMatter: false }),
			);
		const onSaveResult = vi.fn();
		const opts = options({ post, onSaveResult });
		const saver = createPageSaver(opts);

		expect(await saver.save('<p>1</p>')).toBe(false);
		await saver.save('<p>2</p>');

		expect(opts.showFailure).toHaveBeenCalledWith('conflict');
		expect(opts.onHumanSave).toHaveBeenCalledOnce();
		expect(onSaveResult.mock.calls).toEqual([[false], [true]]);
		expect(bodyOf(post, 1)).toMatchObject({ baseHash: 'h0' });
	});

	test('a save that moved the page makes the tab follow its new path', async () => {
		const post = vi.fn().mockResolvedValue(
			jsonResponse({
				saved: true,
				path: '/x',
				hasFrontMatter: true,
				logicalPath: '/company/about.html',
			}),
		);
		const opts = options({ post });
		const saver = createPageSaver(opts);

		await saver.save('<p>1</p>', { path: 'company/about.html' });

		expect(opts.followMovedPage).toHaveBeenCalledWith('/company/about.html');
	});
});
