import type { LocalServerConfig } from './types.js';

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { loadResolverState } from './model/virtual-path-resolver.js';
import { setRoute } from './route.js';

/**
 * Spin up a fresh tmp documentRoot + assetsRoot pair. Each test gets its own
 * tree so that file writes don't leak between cases.
 */
async function makeTmpDocumentRoot(): Promise<{
	documentRoot: string;
	assetsRoot: string;
}> {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), 'bge-route-'));
	const documentRoot = path.join(root, 'docs');
	const assetsRoot = path.join(root, 'assets');
	await fs.mkdir(documentRoot);
	await fs.mkdir(assetsRoot);
	return { documentRoot, assetsRoot };
}

type ConfigOverrides = {
	virtualTreeEnabled: boolean;
	pathKey?: string;
	editableArea?: string | null;
};

/**
 *
 * @param documentRoot
 * @param assetsRoot
 * @param overrides
 */
function makeConfig(
	documentRoot: string,
	assetsRoot: string,
	overrides: ConfigOverrides,
): LocalServerConfig {
	const { virtualTreeEnabled, pathKey = 'path', editableArea = null } = overrides;
	return {
		version: '0.0.0-test',
		port: 0,
		host: 'localhost',
		documentRoot,
		assetsRoot,
		lang: 'en',
		stylesheets: [],
		classList: [],
		editableArea,
		indexFileName: 'index.html',
		filesDir: {
			image: { serverPath: assetsRoot, clientPath: '/files' },
			pdf: { serverPath: assetsRoot, clientPath: '/files' },
			video: { serverPath: assetsRoot, clientPath: '/files' },
			audio: { serverPath: assetsRoot, clientPath: '/files' },
			other: { serverPath: assetsRoot, clientPath: '/files' },
		},
		sampleImagePath: '/files/sample.png',
		sampleFilePath: '/files/sample.pdf',
		googleMapsApiKey: null,
		open: false,
		newFileContent: '<!doctype html><html><body></body></html>',
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		catalog: {} as any,
		enableImportBlock: false,
		healthCheck: { enabled: false, interval: 10_000, retryCount: 3 },
		virtualTree: { enabled: virtualTreeEnabled, pathKey },
	};
}

/**
 *
 * @param documentRoot
 * @param assetsRoot
 * @param overrides
 */
async function buildApp(
	documentRoot: string,
	assetsRoot: string,
	overrides: ConfigOverrides,
): Promise<Hono> {
	const app = new Hono();
	const userConfig = makeConfig(documentRoot, assetsRoot, overrides);
	const resolverState = userConfig.virtualTree.enabled
		? await loadResolverState(userConfig.documentRoot, userConfig.virtualTree.pathKey)
		: null;
	setRoute(app, userConfig, resolverState);
	return app;
}

describe('GET /api/tree', () => {
	let documentRoot: string;
	let assetsRoot: string;

	beforeEach(async () => {
		({ documentRoot, assetsRoot } = await makeTmpDocumentRoot());
	});

	afterEach(async () => {
		await fs.rm(path.dirname(documentRoot), { recursive: true, force: true });
	});

	test('returns logical tree built from frontmatter when virtualTree is enabled', async () => {
		await fs.writeFile(
			path.join(documentRoot, '1.html'),
			'---\npath: about.html\n---\n<h1>About</h1>\n',
			'utf8',
		);
		await fs.writeFile(
			path.join(documentRoot, '2.html'),
			'---\npath: foo/bar.html\n---\n<h1>Bar</h1>\n',
			'utf8',
		);

		const app = await buildApp(documentRoot, assetsRoot, { virtualTreeEnabled: true });
		const res = await app.request('/api/tree');
		expect(res.status).toBe(200);
		const body = (await res.json()) as {
			tree: { name: string; path: string; id?: string; files?: unknown[] }[];
		};
		const names = body.tree.map((n) => n.name).toSorted();
		expect(names).toEqual(['about.html', 'foo']);
		// File leaves at the top level carry the disk id so the client can
		// render `name (id)` labels in virtualTree mode.
		const aboutLeaf = body.tree.find((n) => n.name === 'about.html');
		expect(aboutLeaf?.id).toBe('1.html');
	});

	test('virtual mode propagates id to nested leaves under DirInfo, not just the top level', async () => {
		await fs.writeFile(
			path.join(documentRoot, '7.html'),
			'---\npath: foo/bar/deep.html\n---\n<h1>Deep</h1>\n',
			'utf8',
		);
		const app = await buildApp(documentRoot, assetsRoot, { virtualTreeEnabled: true });
		const res = await app.request('/api/tree');
		const body = (await res.json()) as {
			tree: {
				name: string;
				path: string;
				id?: string;
				files?: { name: string; id?: string; files?: unknown[] }[];
			}[];
		};
		const fooDir = body.tree.find((n) => n.name === 'foo');
		expect(fooDir?.id).toBeUndefined(); // dirs themselves carry no id
		const barDir = fooDir?.files?.find((n) => n.name === 'bar') as
			| { name: string; id?: string; files?: { name: string; id?: string }[] }
			| undefined;
		const deepLeaf = barDir?.files?.find((n) => n.name === 'deep.html');
		expect(deepLeaf?.id).toBe('7.html');
	});

	test('directory mode tree leaves do not include an id field', async () => {
		await fs.writeFile(path.join(documentRoot, 'home.html'), '<h1>Home</h1>', 'utf8');
		const app = await buildApp(documentRoot, assetsRoot, { virtualTreeEnabled: false });
		const res = await app.request('/api/tree');
		const body = (await res.json()) as { tree: { name: string; id?: string }[] };
		expect(body.tree[0]?.name).toBe('home.html');
		expect(body.tree[0]?.id).toBeUndefined();
	});

	test('returns directory-based tree when virtualTree is disabled', async () => {
		await fs.mkdir(path.join(documentRoot, 'sub'));
		await fs.writeFile(
			path.join(documentRoot, 'sub', 'page.html'),
			'<h1>Page</h1>',
			'utf8',
		);

		const app = await buildApp(documentRoot, assetsRoot, { virtualTreeEnabled: false });
		const res = await app.request('/api/tree');
		expect(res.status).toBe(200);
		const body = (await res.json()) as { tree: { name: string }[] };
		expect(body.tree.map((n) => n.name)).toEqual(['sub']);
	});
});

describe('GET /:page (virtual mode)', () => {
	let documentRoot: string;
	let assetsRoot: string;

	beforeEach(async () => {
		({ documentRoot, assetsRoot } = await makeTmpDocumentRoot());
	});

	afterEach(async () => {
		await fs.rm(path.dirname(documentRoot), { recursive: true, force: true });
	});

	test('serves an HTML page when the logical path is registered', async () => {
		await fs.writeFile(
			path.join(documentRoot, '1.html'),
			'---\npath: foo/about.html\n---\n<h1>About</h1>\n',
			'utf8',
		);
		const app = await buildApp(documentRoot, assetsRoot, { virtualTreeEnabled: true });

		const res = await app.request('/foo/about.html');
		expect(res.status).toBe(200);
		expect(res.headers.get('content-type') ?? '').toMatch(/html/i);
	});

	test('returns 404 when the logical path is not registered', async () => {
		await fs.writeFile(
			path.join(documentRoot, '1.html'),
			'---\npath: foo/about.html\n---\n<h1>About</h1>\n',
			'utf8',
		);
		const app = await buildApp(documentRoot, assetsRoot, { virtualTreeEnabled: true });

		const res = await app.request('/nope/missing.html');
		expect(res.status).toBe(404);
	});
});

describe('POST /api/content/create (virtual mode)', () => {
	let documentRoot: string;
	let assetsRoot: string;

	beforeEach(async () => {
		({ documentRoot, assetsRoot } = await makeTmpDocumentRoot());
	});

	afterEach(async () => {
		await fs.rm(path.dirname(documentRoot), { recursive: true, force: true });
	});

	test('writes <id>.html with frontmatter and registers logical path', async () => {
		const app = await buildApp(documentRoot, assetsRoot, { virtualTreeEnabled: true });
		const res = await app.request('/api/content/create', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				id: '42.html',
				path: 'foo/new.html',
			}),
		});
		expect(res.status).toBe(200);

		const written = await fs.readFile(path.join(documentRoot, '42.html'), 'utf8');
		expect(written).toContain('path: foo/new.html');

		const treeRes = await app.request('/api/tree');
		const body = (await treeRes.json()) as { tree: { name: string }[] };
		expect(body.tree.map((n) => n.name)).toContain('foo');
	});

	test('accepts a leading-slash logical path and stores it in canonical form (regression)', async () => {
		// Real-world Front Matter pipelines often write `path: /foo.html`.
		// Without normalization, GET /:page lookups fail because Hono path
		// params arrive slash-less.
		const app = await buildApp(documentRoot, assetsRoot, { virtualTreeEnabled: true });
		const res = await app.request('/api/content/create', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ id: '42.html', path: '/foo/bar.html' }),
		});
		expect(res.status).toBe(200);

		const treeRes = await app.request('/api/tree');
		const body = (await treeRes.json()) as { tree: { name: string }[] };
		expect(body.tree.map((n) => n.name)).toContain('foo');

		// The same logical file is reachable via the slashless lookup too.
		const pageRes = await app.request('/foo/bar.html');
		expect(pageRes.status).toBe(200);
	});

	test('rejects with 400 when path normalizes to empty (e.g. "/")', async () => {
		const app = await buildApp(documentRoot, assetsRoot, { virtualTreeEnabled: true });
		const res = await app.request('/api/content/create', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ id: '42.html', path: '/' }),
		});
		expect(res.status).toBe(400);
		const before = await fs.readdir(documentRoot);
		// And no disk file was created for the rejected entry.
		expect(before).not.toContain('42.html');
	});

	test('appends .html to the id when the caller omits the extension', async () => {
		const app = await buildApp(documentRoot, assetsRoot, { virtualTreeEnabled: true });
		const res = await app.request('/api/content/create', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ id: '42', path: 'foo.html' }),
		});
		expect(res.status).toBe(200);
		await fs.access(path.join(documentRoot, '42.html'));
	});

	test('writes the file successfully even when editableArea is set (regression: ENOENT on new files)', async () => {
		// Production projects almost always set editableArea to a CSS selector, but
		// saveContent's editableArea path tries to read the existing file first.
		// /api/content/create must short-circuit that path so new files don't ENOENT.
		const app = await buildApp(documentRoot, assetsRoot, {
			virtualTreeEnabled: true,
			editableArea: 'body',
		});
		const res = await app.request('/api/content/create', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ id: '7.html', path: 'home.html' }),
		});
		expect(res.status).toBe(200);

		const written = await fs.readFile(path.join(documentRoot, '7.html'), 'utf8');
		expect(written).toContain('path: home.html');
	});

	test('persists supplied content and frontmatter, while pathKey wins over a colliding frontmatter entry', async () => {
		const app = await buildApp(documentRoot, assetsRoot, { virtualTreeEnabled: true });
		const res = await app.request('/api/content/create', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				id: '5.html',
				path: 'docs/intro.html',
				content: '<article>Hello</article>',
				frontMatter: { title: 'Intro', path: 'wrong.html' },
			}),
		});
		expect(res.status).toBe(200);

		const written = await fs.readFile(path.join(documentRoot, '5.html'), 'utf8');
		expect(written).toContain('path: docs/intro.html');
		expect(written).toContain('title: Intro');
		expect(written).toContain('Hello');
	});

	test('rejects with 409 when logical path conflicts with an existing entry', async () => {
		await fs.writeFile(
			path.join(documentRoot, '1.html'),
			'---\npath: about.html\n---\n<h1>About</h1>\n',
			'utf8',
		);
		const app = await buildApp(documentRoot, assetsRoot, { virtualTreeEnabled: true });

		const res = await app.request('/api/content/create', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ id: '2.html', path: 'about.html' }),
		});
		expect(res.status).toBe(409);
		const body = (await res.json()) as { error?: string };
		expect(body.error).toMatch(/Conflicting logical paths/);
	});

	test('rejects with 409 and an id-centric message when id already exists on disk', async () => {
		await fs.writeFile(
			path.join(documentRoot, '1.html'),
			'---\npath: about.html\n---\n<h1>About</h1>\n',
			'utf8',
		);
		const app = await buildApp(documentRoot, assetsRoot, { virtualTreeEnabled: true });

		const res = await app.request('/api/content/create', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ id: '1.html', path: 'other.html' }),
		});
		expect(res.status).toBe(409);
		const body = (await res.json()) as { error?: string };
		// Must speak about the id collision, not "logical path conflict".
		expect(body.error).toMatch(/"1\.html" is already in use/);
		expect(body.error).toContain('about.html');
		expect(body.error).not.toMatch(/Conflicting logical paths/);
	});

	test.each([
		{ label: '../escape', id: '../escape' },
		{ label: '..\\escape (windows-style)', id: '..\\escape' },
		{ label: 'subdir/foo', id: 'subdir/foo' },
		{ label: '..', id: '..' },
		{ label: '.', id: '.' },
		{ label: 'leading-dot dotfile', id: '.hidden' },
		{ label: 'NUL byte', id: 'foo\0bar' },
	])(
		'rejects path-traversal id $label without writing outside documentRoot',
		async ({ id }) => {
			const app = await buildApp(documentRoot, assetsRoot, {
				virtualTreeEnabled: true,
			});
			const before = await fs.readdir(path.dirname(documentRoot));
			const res = await app.request('/api/content/create', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ id, path: 'evil.html' }),
			});
			expect(res.status).toBeGreaterThanOrEqual(400);
			expect(res.status).toBeLessThan(500);

			// Nothing was written outside the docRoot.
			const after = await fs.readdir(path.dirname(documentRoot));
			expect(after.toSorted()).toEqual(before.toSorted());
		},
	);

	test.each([
		{ label: 'leading "../"', logicalPath: '../foo.html' },
		{ label: 'interior ".."', logicalPath: 'foo/../bar.html' },
		{ label: 'leading "./"', logicalPath: './foo.html' },
		{ label: 'interior "."', logicalPath: 'foo/./bar.html' },
		{ label: 'just ".."', logicalPath: '..' },
		{ label: 'just "."', logicalPath: '.' },
		{ label: 'NUL byte', logicalPath: 'foo\0bar.html' },
	])(
		'rejects with 400 when logical path contains $label (regression: #755)',
		async ({ logicalPath }) => {
			// Without this guard the resolver registers e.g. "../foo.html" as a
			// logical key, but the browser silently normalizes the corresponding
			// `<a href>` away to "/foo.html", orphaning the disk file from the
			// editor UI.
			const app = await buildApp(documentRoot, assetsRoot, {
				virtualTreeEnabled: true,
			});
			const res = await app.request('/api/content/create', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ id: '42.html', path: logicalPath }),
			});
			expect(res.status).toBe(400);

			// And no disk file was created for the rejected entry.
			const inside = await fs.readdir(documentRoot);
			expect(inside).not.toContain('42.html');
		},
	);

	test('returns 400 when virtualTree mode is disabled', async () => {
		const app = await buildApp(documentRoot, assetsRoot, { virtualTreeEnabled: false });
		const res = await app.request('/api/content/create', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ id: '1.html', path: 'about.html' }),
		});
		expect(res.status).toBe(400);
	});
});

describe('POST /api/content (virtual mode, path change)', () => {
	let documentRoot: string;
	let assetsRoot: string;

	beforeEach(async () => {
		({ documentRoot, assetsRoot } = await makeTmpDocumentRoot());
	});

	afterEach(async () => {
		await fs.rm(path.dirname(documentRoot), { recursive: true, force: true });
	});

	test('updates frontmatter path and reflects in tree without moving disk file', async () => {
		await fs.writeFile(
			path.join(documentRoot, '1.html'),
			'---\npath: about.html\n---\n<h1>About</h1>\n',
			'utf8',
		);
		const app = await buildApp(documentRoot, assetsRoot, { virtualTreeEnabled: true });

		const saveRes = await app.request('/api/content', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				path: 'about.html',
				content: '<h1>About</h1>',
				frontMatter: { path: 'company/about.html' },
			}),
		});
		expect(saveRes.status).toBe(200);

		// disk file at original id stays
		await fs.access(path.join(documentRoot, '1.html'));

		// tree now exposes the new logical path
		const treeRes = await app.request('/api/tree');
		const body = (await treeRes.json()) as { tree: { name: string }[] };
		expect(body.tree.map((n) => n.name)).toContain('company');
		expect(body.tree.map((n) => n.name)).not.toContain('about.html');
	});

	test('keeps state unchanged when frontmatter omits the pathKey', async () => {
		await fs.writeFile(
			path.join(documentRoot, '1.html'),
			'---\npath: about.html\n---\n<h1>About</h1>\n',
			'utf8',
		);
		const app = await buildApp(documentRoot, assetsRoot, { virtualTreeEnabled: true });

		const saveRes = await app.request('/api/content', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				path: 'about.html',
				content: '<h1>About</h1>',
				frontMatter: { title: 'Renamed Title' },
			}),
		});
		expect(saveRes.status).toBe(200);

		const treeRes = await app.request('/api/tree');
		const body = (await treeRes.json()) as { tree: { name: string }[] };
		expect(body.tree.map((n) => n.name)).toEqual(['about.html']);
	});

	test('updates frontmatter path with a leading slash and reflects in tree (regression)', async () => {
		await fs.writeFile(
			path.join(documentRoot, '1.html'),
			'---\npath: about.html\n---\n<h1>About</h1>\n',
			'utf8',
		);
		const app = await buildApp(documentRoot, assetsRoot, { virtualTreeEnabled: true });

		const saveRes = await app.request('/api/content', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				path: 'about.html',
				content: '<h1>About</h1>',
				frontMatter: { path: '/company/about.html' },
			}),
		});
		expect(saveRes.status).toBe(200);

		const treeRes = await app.request('/api/tree');
		const body = (await treeRes.json()) as { tree: { name: string }[] };
		expect(body.tree.map((n) => n.name)).toContain('company');
	});

	test('rejects with 400 when frontmatter pathKey normalizes to empty (e.g. "/")', async () => {
		await fs.writeFile(
			path.join(documentRoot, '1.html'),
			'---\npath: about.html\n---\n<h1>About</h1>\n',
			'utf8',
		);
		const app = await buildApp(documentRoot, assetsRoot, { virtualTreeEnabled: true });

		const res = await app.request('/api/content', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				path: 'about.html',
				content: '<h1>About</h1>',
				frontMatter: { path: '/' },
			}),
		});
		expect(res.status).toBe(400);
	});

	test.each([
		{ label: 'leading "../"', value: '../foo.html' },
		{ label: 'interior ".."', value: 'foo/../bar.html' },
		{ label: 'leading "./"', value: './foo.html' },
		{ label: 'NUL byte', value: 'foo\0bar.html' },
	])(
		'rejects with 400 when frontmatter pathKey contains $label (regression: #755)',
		async ({ value }) => {
			await fs.writeFile(
				path.join(documentRoot, '1.html'),
				'---\npath: about.html\n---\n<h1>About</h1>\n',
				'utf8',
			);
			const app = await buildApp(documentRoot, assetsRoot, { virtualTreeEnabled: true });

			const res = await app.request('/api/content', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					path: 'about.html',
					content: '<h1>About</h1>',
					frontMatter: { path: value },
				}),
			});
			expect(res.status).toBe(400);

			// Tree must not have advanced to the rejected path.
			const treeRes = await app.request('/api/tree');
			const body = (await treeRes.json()) as { tree: { name: string }[] };
			expect(body.tree.map((n) => n.name)).toEqual(['about.html']);
		},
	);

	test('rejects with 400 when the lookup path itself contains ".." (regression: #755)', async () => {
		await fs.writeFile(
			path.join(documentRoot, '1.html'),
			'---\npath: about.html\n---\n<h1>About</h1>\n',
			'utf8',
		);
		const app = await buildApp(documentRoot, assetsRoot, { virtualTreeEnabled: true });

		const res = await app.request('/api/content', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				path: '../escape.html',
				content: '<h1>Evil</h1>',
			}),
		});
		expect(res.status).toBe(400);
	});

	test.each([
		{ label: 'empty string', value: '' },
		{ label: 'null', value: null },
		{ label: 'number', value: 42 },
		{ label: 'object', value: { nested: 'x' } },
	])('rejects with 400 when frontmatter pathKey is $label', async ({ value }) => {
		await fs.writeFile(
			path.join(documentRoot, '1.html'),
			'---\npath: about.html\n---\n<h1>About</h1>\n',
			'utf8',
		);
		const app = await buildApp(documentRoot, assetsRoot, { virtualTreeEnabled: true });

		const res = await app.request('/api/content', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				path: 'about.html',
				content: '<h1>About</h1>',
				frontMatter: { path: value },
			}),
		});
		expect(res.status).toBe(400);
	});

	test('rejects with 409 when path change conflicts with another logical path', async () => {
		await fs.writeFile(
			path.join(documentRoot, '1.html'),
			'---\npath: about.html\n---\n<h1>About</h1>\n',
			'utf8',
		);
		await fs.writeFile(
			path.join(documentRoot, '2.html'),
			'---\npath: contact.html\n---\n<h1>Contact</h1>\n',
			'utf8',
		);
		const app = await buildApp(documentRoot, assetsRoot, { virtualTreeEnabled: true });

		const res = await app.request('/api/content', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				path: 'about.html',
				content: '<h1>About</h1>',
				frontMatter: { path: 'contact.html' },
			}),
		});
		expect(res.status).toBe(409);
	});
});

describe('POST /api/content (virtual mode, 2-phase commit)', () => {
	let documentRoot: string;
	let assetsRoot: string;

	beforeEach(async () => {
		({ documentRoot, assetsRoot } = await makeTmpDocumentRoot());
	});

	afterEach(async () => {
		await fs.rm(path.dirname(documentRoot), { recursive: true, force: true });
		vi.restoreAllMocks();
	});

	test('does not advance resolverState when saveContent fails', async () => {
		await fs.writeFile(
			path.join(documentRoot, '1.html'),
			'---\npath: about.html\n---\n<h1>About</h1>\n',
			'utf8',
		);
		const app = await buildApp(documentRoot, assetsRoot, { virtualTreeEnabled: true });

		// Make the next writeFile call fail (saveContent calls writeFile after Prettier).
		const writeSpy = vi
			.spyOn(fs, 'writeFile')
			.mockRejectedValueOnce(Object.assign(new Error('disk full'), { code: 'ENOSPC' }));

		let saveRes: Response;
		try {
			saveRes = await app.request('/api/content', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					path: 'about.html',
					content: '<h1>About</h1>',
					frontMatter: { path: 'company/about.html' },
				}),
			});
		} catch (error) {
			// Hono surfaces unhandled errors as a thrown promise; tolerate either shape.
			saveRes = new Response(String(error), { status: 500 });
		}

		expect(saveRes.status).toBeGreaterThanOrEqual(500);
		writeSpy.mockRestore();

		const treeRes = await app.request('/api/tree');
		const body = (await treeRes.json()) as { tree: { name: string }[] };
		// State must not have advanced to the new "company/" path.
		expect(body.tree.map((n) => n.name)).toEqual(['about.html']);
	});
});

describe('POST /api/content (virtual mode, concurrency)', () => {
	let documentRoot: string;
	let assetsRoot: string;

	beforeEach(async () => {
		({ documentRoot, assetsRoot } = await makeTmpDocumentRoot());
	});

	afterEach(async () => {
		await fs.rm(path.dirname(documentRoot), { recursive: true, force: true });
	});

	test('serializes overlapping path-renames so neither update is lost', async () => {
		await fs.writeFile(
			path.join(documentRoot, '1.html'),
			'---\npath: about.html\n---\n<h1>About</h1>\n',
			'utf8',
		);
		await fs.writeFile(
			path.join(documentRoot, '2.html'),
			'---\npath: contact.html\n---\n<h1>Contact</h1>\n',
			'utf8',
		);
		const app = await buildApp(documentRoot, assetsRoot, { virtualTreeEnabled: true });

		// Fire both requests without awaiting, then await as a pair. Without the
		// state lock, the second write would observe the pre-A state and clobber
		// A's update.
		const a = app.request('/api/content', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				path: 'about.html',
				content: '<h1>About</h1>',
				frontMatter: { path: 'company/about.html' },
			}),
		});
		const b = app.request('/api/content', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				path: 'contact.html',
				content: '<h1>Contact</h1>',
				frontMatter: { path: 'company/contact.html' },
			}),
		});
		const [resA, resB] = await Promise.all([a, b]);
		expect(resA.status).toBe(200);
		expect(resB.status).toBe(200);

		const treeRes = await app.request('/api/tree');
		const body = (await treeRes.json()) as { tree: { name: string }[] };
		// Both renames must be reflected in the tree.
		expect(body.tree.map((n) => n.name).toSorted()).toEqual(['company']);
	});
});

describe('POST /api/content (non-virtual passthrough)', () => {
	let documentRoot: string;
	let assetsRoot: string;

	beforeEach(async () => {
		({ documentRoot, assetsRoot } = await makeTmpDocumentRoot());
	});

	afterEach(async () => {
		await fs.rm(path.dirname(documentRoot), { recursive: true, force: true });
	});

	test('rejects ../escape.html in non-virtual mode without writing outside documentRoot', async () => {
		const app = await buildApp(documentRoot, assetsRoot, { virtualTreeEnabled: false });
		const before = await fs.readdir(path.dirname(documentRoot));
		const res = await app.request('/api/content', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				path: '../escape.html',
				content: '<h1>Evil</h1>',
			}),
		});
		expect(res.status).toBe(400);
		const after = await fs.readdir(path.dirname(documentRoot));
		expect(after.toSorted()).toEqual(before.toSorted());
	});

	test('writes file at the requested disk path when virtualTree is disabled', async () => {
		const app = await buildApp(documentRoot, assetsRoot, { virtualTreeEnabled: false });

		const res = await app.request('/api/content', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				path: 'plain.html',
				content: '<h1>Plain</h1>',
			}),
		});
		expect(res.status).toBe(200);
		const written = await fs.readFile(path.join(documentRoot, 'plain.html'), 'utf8');
		expect(written).toContain('<h1>Plain</h1>');
	});

	test('preserves existing path-rename behavior with editableArea: "body"', async () => {
		await fs.writeFile(
			path.join(documentRoot, '1.html'),
			'---\npath: about.html\n---\n<body><main>old</main></body>\n',
			'utf8',
		);
		const app = await buildApp(documentRoot, assetsRoot, {
			virtualTreeEnabled: true,
			editableArea: 'body',
		});

		const res = await app.request('/api/content', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				path: 'about.html',
				content: '<main>new</main>',
				frontMatter: { path: 'company/about.html' },
			}),
		});
		expect(res.status).toBe(200);

		// Disk file is at the original id; logical tree reflects the new path.
		const written = await fs.readFile(path.join(documentRoot, '1.html'), 'utf8');
		expect(written).toContain('new');
		const treeRes = await app.request('/api/tree');
		const body = (await treeRes.json()) as { tree: { name: string }[] };
		expect(body.tree.map((n) => n.name)).toContain('company');
	});
});

describe('GET /:page (non-virtual fallthrough)', () => {
	let documentRoot: string;
	let assetsRoot: string;

	beforeEach(async () => {
		({ documentRoot, assetsRoot } = await makeTmpDocumentRoot());
	});

	afterEach(async () => {
		await fs.rm(path.dirname(documentRoot), { recursive: true, force: true });
	});

	test('serves an existing disk file as HTML when virtualTree is disabled', async () => {
		await fs.writeFile(path.join(documentRoot, 'home.html'), '<h1>Home</h1>', 'utf8');
		const app = await buildApp(documentRoot, assetsRoot, { virtualTreeEnabled: false });

		const res = await app.request('/home.html');
		expect(res.status).toBe(200);
		expect(res.headers.get('content-type') ?? '').toMatch(/html/i);
	});
});
