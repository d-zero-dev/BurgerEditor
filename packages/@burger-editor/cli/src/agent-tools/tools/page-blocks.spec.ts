// dom-shim side-effect — must come before any handler call that touches DOMParser.
import '@burger-editor/file-io';

import fs from 'node:fs/promises';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { type AgentToolFixture, makeFixture } from '../__tests__/fixture.js';
import { AgentError } from '../errors.js';

import { pageBlocksTool } from './page-blocks.js';

let fixture: AgentToolFixture;

beforeEach(async () => {
	fixture = await makeFixture();
});

afterEach(async () => {
	await fixture.tmp[Symbol.asyncDispose]();
});

describe('page_blocks — first call (no readToken)', () => {
	test('returns blockCount + readToken + next, without a blocks field', async () => {
		const result = (await pageBlocksTool.run(fixture.ctx, {
			path: 'about.html',
		})) as Record<string, unknown>;
		expect(result.blockCount).toBe(2);
		expect(typeof result.readToken).toBe('string');
		expect(typeof result.next).toBe('string');
		expect(result.blocks).toBeUndefined();
		expect(result.recommendation).toBe('fetch-all');
	});
});

describe('page_blocks — second call (with readToken)', () => {
	test('returns the full block list with text/headings/itemNames', async () => {
		const first = (await pageBlocksTool.run(fixture.ctx, { path: 'about.html' })) as {
			readToken: string;
		};
		const second = (await pageBlocksTool.run(fixture.ctx, {
			path: 'about.html',
			readToken: first.readToken,
		})) as { blocks: Array<Record<string, unknown>>; readToken: string };
		expect(second.blocks).toHaveLength(2);
		expect(second.blocks[0]).toMatchObject({ index: 0, name: 'h2' });
		expect(second.blocks[0]!.text).toContain('最初の見出し');
		expect(second.blocks[0]!.headings).toEqual([{ level: 2, text: '最初の見出し' }]);
		expect(second.blocks[1]).toMatchObject({ index: 1, name: 'wysiwyg' });
		expect(typeof second.readToken).toBe('string');
	});

	test('filter.text narrows to matching blocks', async () => {
		const first = (await pageBlocksTool.run(fixture.ctx, { path: 'about.html' })) as {
			readToken: string;
		};
		const result = (await pageBlocksTool.run(fixture.ctx, {
			path: 'about.html',
			readToken: first.readToken,
			filter: { text: '本文1' },
		})) as { blocks: Array<{ index: number }> };
		expect(result.blocks.map((b) => b.index)).toEqual([1]);
	});

	test('filter.blockName narrows by block catalog name', async () => {
		const first = (await pageBlocksTool.run(fixture.ctx, { path: 'about.html' })) as {
			readToken: string;
		};
		const result = (await pageBlocksTool.run(fixture.ctx, {
			path: 'about.html',
			readToken: first.readToken,
			filter: { blockName: 'h2' },
		})) as { blocks: Array<{ index: number }> };
		expect(result.blocks.map((b) => b.index)).toEqual([0]);
	});

	test('filter.headingLevel narrows to blocks containing that heading level', async () => {
		const first = (await pageBlocksTool.run(fixture.ctx, { path: 'about.html' })) as {
			readToken: string;
		};
		const result = (await pageBlocksTool.run(fixture.ctx, {
			path: 'about.html',
			readToken: first.readToken,
			filter: { headingLevel: 2 },
		})) as { blocks: Array<{ index: number }> };
		expect(result.blocks.map((b) => b.index)).toEqual([0]);
	});

	test('an invalid filter.regex rejects with an AgentError instead of throwing a raw SyntaxError', async () => {
		const first = (await pageBlocksTool.run(fixture.ctx, { path: 'about.html' })) as {
			readToken: string;
		};
		await expect(
			pageBlocksTool.run(fixture.ctx, {
				path: 'about.html',
				readToken: first.readToken,
				filter: { regex: '(' },
			}),
		).rejects.toBeInstanceOf(AgentError);
	});

	test('range pages through blocks with a half-open [from, to)', async () => {
		const first = (await pageBlocksTool.run(fixture.ctx, { path: 'about.html' })) as {
			readToken: string;
		};
		const result = (await pageBlocksTool.run(fixture.ctx, {
			path: 'about.html',
			readToken: first.readToken,
			range: { from: 1, to: 2 },
		})) as { blocks: Array<{ index: number }> };
		expect(result.blocks.map((b) => b.index)).toEqual([1]);
	});

	test('rejects a stale token (content changed since it was issued) as stale', async () => {
		const first = (await pageBlocksTool.run(fixture.ctx, { path: 'about.html' })) as {
			readToken: string;
		};
		await fs.appendFile(
			path.join(fixture.docRoot, 'about.html'),
			'\n<!-- external edit -->',
		);
		const error = await pageBlocksTool
			.run(fixture.ctx, { path: 'about.html', readToken: first.readToken })
			.catch((error_: unknown) => error_);
		expect(error).toBeInstanceOf(AgentError);
		expect((error as AgentError).code).toBe('stale');
	});

	test('rejects a token minted for a different path', async () => {
		await fs.writeFile(
			path.join(fixture.docRoot, 'other.html'),
			'---\ntitle: Other\n---\n<div class="content"></div>',
			'utf8',
		);
		const first = (await pageBlocksTool.run(fixture.ctx, { path: 'about.html' })) as {
			readToken: string;
		};
		const error = await pageBlocksTool
			.run(fixture.ctx, { path: 'other.html', readToken: first.readToken })
			.catch((error_: unknown) => error_);
		expect(error).toBeInstanceOf(AgentError);
		expect((error as AgentError).code).toBe('stale');
	});
});
