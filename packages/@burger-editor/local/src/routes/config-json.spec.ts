// `/config.json` is defined inline in `createApp()` (`../app.ts`), not in a file
// under `routes/`, so its test lives here.
import fs from 'node:fs/promises';
import path from 'node:path';

import { clearConfigCache, resolveConfig } from '@burger-editor/file-io';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import {
	createTestApp,
	makeTmpRoots,
	type TestApp,
	type TmpRoots,
} from '../__tests__/fixtures.js';
import { PAGE_HTML } from '../__tests__/protocol-fixtures.js';

let tmp: TmpRoots | undefined;
let t: TestApp | undefined;

beforeEach(async () => {
	// cosmiconfig memoizes lookups by directory
	clearConfigCache();
	tmp = await makeTmpRoots('bge-config-json-', { pages: { 'a.html': PAGE_HTML } });
});

afterEach(async () => {
	await t?.[Symbol.asyncDispose]();
	t = undefined;
	await tmp?.[Symbol.asyncDispose]();
});

/**
 * Write a project config file, resolve it the way the server does, and read the
 * `/config.json` the browser editor would get — the whole way from the file to
 * the response, so a key dropped in any step shows up.
 * @param extra - Extra source lines of the config object
 */
async function getConfigJson(extra = '') {
	await fs.writeFile(
		path.join(tmp!.path, 'burgereditor.config.mjs'),
		`export default {
	documentRoot: ${JSON.stringify(tmp!.documentRoot)},
	agent: { enabled: false },
	${extra}
};`,
		'utf8',
	);
	const { config } = await resolveConfig(tmp!.path);
	t = await createTestApp({ config, configDir: tmp!.path });
	const res = await t.app.request('/config.json', { headers: { host: 'localhost' } });
	return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

describe('GET /config.json', () => {
	// The browser editor builds its engine config from this response, and an
	// image item reads `mediaQueries` from it to choose and fill the media query
	// of a second image. If the key were dropped on the way, a project's setting
	// would silently fall back to the default in the editor only.
	test('carries mediaQueries from the project config file to the browser editor', async () => {
		const { status, body } = await getConfigJson(
			"mediaQueries: ['(max-width: 599px)', '(max-width: 1023px)'],",
		);

		expect(status).toBe(200);
		expect(body['mediaQueries']).toStrictEqual([
			'(max-width: 599px)',
			'(max-width: 1023px)',
		]);
	});

	test('omits mediaQueries when the project does not set it', async () => {
		const { status, body } = await getConfigJson();

		expect(status).toBe(200);
		expect(body).not.toHaveProperty('mediaQueries');
	});
});
