// dom-shim side-effect — must come before any handler call that touches DOMParser.
import '@burger-editor/file-io';

import fs from 'node:fs/promises';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { type AgentToolFixture, makeFixture } from '../__tests__/fixture.js';
import { AgentError } from '../errors.js';

import { pageBlocksTool } from './page-blocks.js';
import {
	pageConcatTool,
	pageCopyTool,
	pageCreateTool,
	pageDeleteTool,
	pageGetTool,
	pageRenameTool,
} from './page.js';

let fixture: AgentToolFixture;

/**
 *
 * @param filePath
 */
async function readToken(filePath = 'about.html'): Promise<string> {
	const first = (await pageBlocksTool.run(fixture.ctx, { path: filePath })) as {
		readToken: string;
	};
	return first.readToken;
}

beforeEach(async () => {
	fixture = await makeFixture();
});

afterEach(async () => {
	await fixture.tmp[Symbol.asyncDispose]();
});

describe('page_get', () => {
	test('returns raw content and parsed Front Matter without needing a readToken', async () => {
		const result = (await pageGetTool.run(fixture.ctx, { path: 'about.html' })) as {
			frontMatter: { title: string };
			content: string;
		};
		expect(result.frontMatter.title).toBe('Test Page');
		expect(result.content).toContain('class="content"');
	});
});

describe('page_create', () => {
	test('creates a new page without needing a readToken', async () => {
		const result = await pageCreateTool.run(fixture.ctx, { path: 'fresh.html' });
		expect(result).toMatchObject({ path: 'fresh.html', created: true });
	});

	test('fails with exists when the path is already taken', async () => {
		const error = await pageCreateTool
			.run(fixture.ctx, { path: 'about.html' })
			.catch((error_: unknown) => error_);
		expect(error).toBeInstanceOf(AgentError);
		expect((error as AgentError).code).toBe('exists');
	});
});

describe('page_delete / page_rename / page_copy require readToken', () => {
	test('page_delete rejects without a readToken', async () => {
		const error = await pageDeleteTool
			.run(fixture.ctx, { path: 'about.html' })
			.catch((error_: unknown) => error_);
		expect(error).toBeInstanceOf(AgentError);
		expect((error as AgentError).code).toBe('read-required');
	});

	test('page_rename rejects without a readToken', async () => {
		const error = await pageRenameTool
			.run(fixture.ctx, { from: 'about.html', to: 'moved.html' })
			.catch((error_: unknown) => error_);
		expect(error).toBeInstanceOf(AgentError);
		expect((error as AgentError).code).toBe('read-required');
	});
});

describe('page_rename / page_copy — no-clobber', () => {
	test('page_rename fails with exists when the destination already exists', async () => {
		await pageCreateTool.run(fixture.ctx, { path: 'taken.html' });
		const token = await readToken();
		const error = await pageRenameTool
			.run(fixture.ctx, { from: 'about.html', to: 'taken.html', readToken: token })
			.catch((error_: unknown) => error_);
		expect(error).toBeInstanceOf(AgentError);
		expect((error as AgentError).code).toBe('exists');
		// Neither file changed.
		await expect(
			fs.access(path.join(fixture.docRoot, 'about.html')),
		).resolves.toBeUndefined();
	});

	test('page_copy fails with exists when the destination already exists', async () => {
		await pageCreateTool.run(fixture.ctx, { path: 'taken.html' });
		const token = await readToken();
		const error = await pageCopyTool
			.run(fixture.ctx, { from: 'about.html', to: 'taken.html', readToken: token })
			.catch((error_: unknown) => error_);
		expect(error).toBeInstanceOf(AgentError);
		expect((error as AgentError).code).toBe('exists');
	});

	test('page_rename succeeds and returns a fresh readToken when the destination is free', async () => {
		const token = await readToken();
		const result = (await pageRenameTool.run(fixture.ctx, {
			from: 'about.html',
			to: 'company/about.html',
			readToken: token,
		})) as { renamed: boolean; readToken: string };
		expect(result.renamed).toBe(true);
		expect(typeof result.readToken).toBe('string');
	});
});

describe('page_concat', () => {
	test('requires a readToken for every source', async () => {
		await pageCreateTool.run(fixture.ctx, { path: 'extra.html' });
		const error = await pageConcatTool
			.run(fixture.ctx, {
				sources: [{ path: 'extra.html', readToken: undefined }],
				to: { path: 'about.html' },
			})
			.catch((error_: unknown) => error_);
		expect(error).toBeInstanceOf(AgentError);
		expect((error as AgentError).code).toBe('read-required');
	});

	test('requires a readToken for an existing `to`, but not for a `to` that will be created', async () => {
		await pageCreateTool.run(fixture.ctx, {
			path: 'extra.html',
			blocks: [
				{ catalog: 'h2', items: [[{ name: 'title-h2', data: { titleH2: '追加' } }]] },
			],
		});
		const sourceToken = await readToken('extra.html');

		// `to` doesn't exist yet — no token required for it.
		const created = (await pageConcatTool.run(fixture.ctx, {
			sources: [{ path: 'extra.html', readToken: sourceToken }],
			to: { path: 'brand-new.html' },
		})) as { readToken: string };
		expect(typeof created.readToken).toBe('string');

		// `to` now exists — a second concat onto it requires its readToken.
		const sourceToken2 = await readToken('extra.html');
		const error = await pageConcatTool
			.run(fixture.ctx, {
				sources: [{ path: 'extra.html', readToken: sourceToken2 }],
				to: { path: 'brand-new.html' },
			})
			.catch((error_: unknown) => error_);
		expect(error).toBeInstanceOf(AgentError);
		expect((error as AgentError).code).toBe('read-required');
	});
});
