import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { hydrateNavTree } from './nav-tree.js';

describe('hydrateNavTree', () => {
	beforeEach(() => {
		document.body.innerHTML = '<div id="nav-tree-mount"></div>';
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	test('does nothing when the mount point is missing', async () => {
		document.body.innerHTML = '';
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		await hydrateNavTree();
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	test('renders <a class="file"> for files and <span class="dir"> for directories', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			Response.json(
				{
					tree: [
						{ name: 'about.html', path: '/about.html' },
						{
							name: 'foo',
							path: '/foo',
							files: [{ name: 'bar.html', path: '/foo/bar.html' }],
						},
					],
				},
				{ status: 200, headers: { 'content-type': 'application/json' } },
			),
		);

		await hydrateNavTree();

		const mount = document.getElementById('nav-tree-mount');
		expect(mount).not.toBeNull();

		const fileLinks = mount!.querySelectorAll('a.file');
		expect([...fileLinks].map((a) => a.getAttribute('href'))).toEqual([
			'/about.html',
			'/foo/bar.html',
		]);

		const dirSpans = mount!.querySelectorAll('span.dir');
		expect([...dirSpans].map((s) => s.textContent)).toEqual(['foo']);
	});

	test('rejects (does not silently swallow) when fetch fails — caller decides recovery', async () => {
		vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));
		await expect(hydrateNavTree()).rejects.toThrow(/network down/);
		// Mount stays empty; no children appended on failure.
		const mount = document.getElementById('nav-tree-mount');
		expect(mount?.childNodes.length ?? 0).toBe(0);
	});

	test('replaces previous children on re-hydrate (idempotent)', async () => {
		const mount = document.getElementById('nav-tree-mount')!;
		mount.append(document.createElement('p'));

		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			Response.json(
				{
					tree: [{ name: 'index.html', path: '/index.html' }],
				},
				{ status: 200, headers: { 'content-type': 'application/json' } },
			),
		);

		await hydrateNavTree();

		expect(mount.querySelectorAll('p')).toHaveLength(0);
		expect(mount.querySelectorAll('a.file')).toHaveLength(1);
	});
});
