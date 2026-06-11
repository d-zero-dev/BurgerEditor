import type { BurgerEditorConfig } from './types.js';

import path from 'node:path';

import { describe, expect, test } from 'vitest';

import { resolvePathInput } from './path-input.js';
import { createEmptyState, registerEntry } from './virtual-path-resolver.js';

const DOC_ROOT = '/abs/docroot';

/**
 *
 * @param overrides
 */
function makeConfig(overrides: Partial<BurgerEditorConfig> = {}): BurgerEditorConfig {
	return {
		version: 'test',
		port: 5255,
		host: 'localhost',
		documentRoot: DOC_ROOT,
		assetsRoot: DOC_ROOT,
		lang: 'en',
		stylesheets: [],
		classList: [],
		editableArea: null,
		indexFileName: 'index.html',
		filesDir: {
			image: { serverPath: '', clientPath: '/' },
			pdf: { serverPath: '', clientPath: '/' },
			video: { serverPath: '', clientPath: '/' },
			audio: { serverPath: '', clientPath: '/' },
			other: { serverPath: '', clientPath: '/' },
		},
		sampleImagePath: '/sample.png',
		sampleFilePath: '/sample.pdf',
		googleMapsApiKey: null,
		open: false,
		newFileContent: '',
		// catalog is unused by resolvePathInput
		catalog: {},
		enableImportBlock: false,
		healthCheck: { enabled: false, interval: 0, retryCount: 0 },
		virtualTree: { enabled: false, pathKey: 'path' },
		...overrides,
	};
}

describe('resolvePathInput', () => {
	test('returns absolute paths inside documentRoot unchanged', () => {
		const config = makeConfig();
		const inside = path.join(DOC_ROOT, 'foo.html');
		expect(resolvePathInput(inside, config, null)).toBe(inside);
	});

	test('re-roots an absolute path that points outside documentRoot under documentRoot', () => {
		// Leading "/" is treated as project-root (web-style), not OS-root.
		// `/elsewhere/foo.html` becomes <docroot>/elsewhere/foo.html.
		const config = makeConfig();
		const out = resolvePathInput('/elsewhere/foo.html', config, null);
		expect(out).toBe(path.join(DOC_ROOT, 'elsewhere/foo.html'));
	});

	test('joins relative path with documentRoot', () => {
		const config = makeConfig();
		const out = resolvePathInput('about.html', config, null);
		expect(out).toBe(path.join(DOC_ROOT, 'about.html'));
	});

	test('strips leading slash and joins relative path with documentRoot', () => {
		const config = makeConfig();
		const out = resolvePathInput('/about.html', config, null);
		expect(out).toBe(path.join(DOC_ROOT, 'about.html'));
	});

	test('appends indexFileName when path ends with /', () => {
		const config = makeConfig({ indexFileName: 'index.html' });
		const out = resolvePathInput('/foo/', config, null);
		expect(out).toBe(path.join(DOC_ROOT, 'foo/index.html'));
	});

	test('treats empty path as root indexFileName', () => {
		const config = makeConfig({ indexFileName: 'index.html' });
		const out = resolvePathInput('', config, null);
		expect(out).toBe(path.join(DOC_ROOT, 'index.html'));
	});

	test('honors a custom indexFileName', () => {
		const config = makeConfig({ indexFileName: 'home.html' });
		const out = resolvePathInput('/foo/', config, null);
		expect(out).toBe(path.join(DOC_ROOT, 'foo/home.html'));
	});

	test('resolves a virtual path via resolver state when virtualTree is enabled', () => {
		const config = makeConfig({
			virtualTree: { enabled: true, pathKey: 'path' },
		});
		const state = registerEntry(createEmptyState(), '42.html', 'foo/bar/about.html');
		const out = resolvePathInput('foo/bar/about.html', config, state);
		expect(out).toBe(path.join(DOC_ROOT, '42.html'));
	});

	test('strips leading slash before virtual lookup', () => {
		const config = makeConfig({
			virtualTree: { enabled: true, pathKey: 'path' },
		});
		const state = registerEntry(createEmptyState(), '42.html', 'about.html');
		const out = resolvePathInput('/about.html', config, state);
		expect(out).toBe(path.join(DOC_ROOT, '42.html'));
	});

	test('falls back to documentRoot join when virtual path is not registered', () => {
		const config = makeConfig({
			virtualTree: { enabled: true, pathKey: 'path' },
		});
		const state = createEmptyState();
		const out = resolvePathInput('unknown.html', config, state);
		expect(out).toBe(path.join(DOC_ROOT, 'unknown.html'));
	});

	test('ignores resolver state when virtualTree is disabled', () => {
		const config = makeConfig({
			virtualTree: { enabled: false, pathKey: 'path' },
		});
		const state = registerEntry(createEmptyState(), '42.html', 'about.html');
		const out = resolvePathInput('about.html', config, state);
		expect(out).toBe(path.join(DOC_ROOT, 'about.html'));
	});
});
