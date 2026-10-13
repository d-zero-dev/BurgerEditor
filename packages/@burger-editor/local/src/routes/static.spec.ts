import fs from 'node:fs/promises';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import {
	createTestApp,
	makeLocalServerConfig,
	makeTmpRoots,
	type TestApp,
	type TmpRoots,
} from '../__tests__/fixtures.js';

let roots: TmpRoots;
let mediaRoot: string;
let t: TestApp;

beforeEach(async () => {
	roots = await makeTmpRoots('bge-static-');
	// A directory distinct from `assetsRoot` so a hit through the `/files/*`
	// media handler can only be explained by `rewriteRequestPath` correctly
	// stripping the `/files` prefix before joining against THIS root — not by
	// coincidentally sharing a directory with the assetsRoot catch-all.
	mediaRoot = path.join(roots.path, 'media');
	await fs.mkdir(mediaRoot);
	await fs.writeFile(path.join(mediaRoot, 'logo.svg'), '<svg></svg>', 'utf8');
	await fs.writeFile(path.join(roots.assetsRoot, 'favicon.ico'), 'ICO', 'utf8');

	t = await createTestApp({
		config: makeLocalServerConfig({
			documentRoot: roots.documentRoot,
			assetsRoot: roots.assetsRoot,
			agent: { enabled: false },
			filesDir: {
				image: { serverPath: mediaRoot, clientPath: '/files' },
				pdf: { serverPath: mediaRoot, clientPath: '/files' },
				video: { serverPath: mediaRoot, clientPath: '/files' },
				audio: { serverPath: mediaRoot, clientPath: '/files' },
				other: { serverPath: mediaRoot, clientPath: '/files' },
			},
		}),
	});
});

afterEach(async () => {
	await t[Symbol.asyncDispose]();
	await roots[Symbol.asyncDispose]();
});

describe('static asset serving (@hono/node-server/serve-static)', () => {
	test('GET /files/<name> strips the clientPath prefix and serves from the configured media dir', async () => {
		const res = await t.request('/files/logo.svg');
		expect(res.status).toBe(200);
		expect(res.headers.get('content-type')).toContain('image/svg+xml');
		expect(await res.text()).toBe('<svg></svg>');
	});

	test('GET /<name> falls through to the assetsRoot catch-all for a file outside every media dir', async () => {
		const res = await t.request('/favicon.ico');
		expect(res.status).toBe(200);
		expect(await res.text()).toBe('ICO');
	});

	test('a file that only exists in the media dir is not reachable via the assetsRoot catch-all', async () => {
		const res = await t.request('/logo.svg');
		expect(res.status).toBe(404);
		expect(await res.text()).toBe('Not Found');
	});

	test('an unknown path answers 404 "Not Found" (app.notFound(), not a bare serveStatic miss)', async () => {
		const res = await t.request('/does-not-exist.png');
		expect(res.status).toBe(404);
		expect(await res.text()).toBe('Not Found');
	});
});
