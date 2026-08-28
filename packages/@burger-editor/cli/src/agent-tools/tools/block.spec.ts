// dom-shim side-effect — must come before any handler call that touches DOMParser.
import '@burger-editor/file-io';

import fs from 'node:fs/promises';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import * as h from '../../handlers.js';
import { type AgentToolFixture, makeFixture } from '../__tests__/fixture.js';
import { AgentError } from '../errors.js';

import {
	blockDeleteTool,
	blockDuplicateTool,
	blockEnsureIdTool,
	blockGetTool,
	blockInsertTool,
	blockMoveTool,
	blockReplaceTool,
	itemUpdateTool,
	pageUpdateTool,
} from './block.js';
import { pageBlocksTool } from './page-blocks.js';

let fixture: AgentToolFixture;

/**
 *
 */
async function readToken(): Promise<string> {
	const first = (await pageBlocksTool.run(fixture.ctx, { path: 'about.html' })) as {
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

describe('read-required contract', () => {
	test('block_get rejects without a readToken', async () => {
		const error = await blockGetTool
			.run(fixture.ctx, { path: 'about.html', target: { index: 0 } })
			.catch((error_: unknown) => error_);
		expect(error).toBeInstanceOf(AgentError);
		expect((error as AgentError).code).toBe('read-required');
	});

	test('block_get rejects an out-of-range index target with a range error, not a silent undefined block', async () => {
		const token = await readToken();
		const error = await blockGetTool
			.run(fixture.ctx, { path: 'about.html', target: { index: 99 }, readToken: token })
			.catch((error_: unknown) => error_);
		expect(error).toBeInstanceOf(AgentError);
		expect((error as AgentError).code).toBe('range');
	});

	test('block_insert rejects without a readToken', async () => {
		const error = await blockInsertTool
			.run(fixture.ctx, {
				path: 'about.html',
				index: 0,
				spec: { catalog: 'h2', items: [[{ name: 'title-h2', data: { titleH2: 'x' } }]] },
			})
			.catch((error_: unknown) => error_);
		expect(error).toBeInstanceOf(AgentError);
		expect((error as AgentError).code).toBe('read-required');
	});
});

describe('successful mutations attach readToken + result.block', () => {
	test('block_insert returns the newly inserted block under result.block', async () => {
		const token = await readToken();
		const result = (await blockInsertTool.run(fixture.ctx, {
			path: 'about.html',
			index: 0,
			spec: { catalog: 'h2', items: [[{ name: 'title-h2', data: { titleH2: '挿入' } }]] },
			readToken: token,
		})) as { readToken: string; appliedTo: string; block: { data: { name: string } } };
		expect(typeof result.readToken).toBe('string');
		expect(result.appliedTo).toBe('disk');
		expect(result.block.data.name).toBe('h2');
	});

	test('block_replace resolves by id target and returns the replacement under result.block', async () => {
		const token1 = await readToken();
		const ensured = (await blockEnsureIdTool.run(fixture.ctx, {
			path: 'about.html',
			target: { index: 0 },
			readToken: token1,
		})) as { id: string; readToken: string };
		const result = (await blockReplaceTool.run(fixture.ctx, {
			path: 'about.html',
			target: { id: ensured.id },
			spec: { catalog: 'h2', items: [[{ name: 'title-h2', data: { titleH2: '差替' } }]] },
			readToken: ensured.readToken,
		})) as { block: { data: { items: unknown[][] } } };
		expect(result.block.data.items[0]![0]).toMatchObject({ data: { titleH2: '差替' } });
	});

	test('block_delete succeeds but omits result.block (the target no longer exists)', async () => {
		const token = await readToken();
		const result = (await blockDeleteTool.run(fixture.ctx, {
			path: 'about.html',
			target: { index: 0 },
			readToken: token,
		})) as { block?: unknown; readToken: string };
		expect(result.block).toBeUndefined();
		expect(typeof result.readToken).toBe('string');
	});

	test('block_move returns the block now at the destination index', async () => {
		const token = await readToken();
		const result = (await blockMoveTool.run(fixture.ctx, {
			path: 'about.html',
			target: { index: 0 },
			to: 1,
			readToken: token,
		})) as { block: { data: { name: string } } };
		expect(result.block.data.name).toBe('h2');
	});

	test('block_duplicate returns the copy under result.block', async () => {
		const token = await readToken();
		const result = (await blockDuplicateTool.run(fixture.ctx, {
			path: 'about.html',
			target: { index: 0 },
			readToken: token,
		})) as { block: { data: { name: string } } };
		expect(result.block.data.name).toBe('h2');
	});

	test('item_update returns the block with the merged item under result.block', async () => {
		const token = await readToken();
		const result = (await itemUpdateTool.run(fixture.ctx, {
			path: 'about.html',
			target: { index: 1 },
			itemIndex: 0,
			data: { wysiwyg: '<p>更新後</p>' },
			readToken: token,
		})) as { block: { data: { items: unknown[][] } } };
		expect(result.block.data.items[0]![0]).toMatchObject({
			name: 'wysiwyg',
			data: { wysiwyg: '<p>更新後</p>' },
		});
	});
});

describe('dryRun returns a before/after diff without writing', () => {
	test('block_replace dryRun diff has both before and after; file untouched', async () => {
		const before = await fs.readFile(path.join(fixture.docRoot, 'about.html'), 'utf8');
		const token = await readToken();
		const result = (await blockReplaceTool.run(fixture.ctx, {
			path: 'about.html',
			target: { index: 0 },
			spec: {
				catalog: 'h2',
				items: [[{ name: 'title-h2', data: { titleH2: 'preview' } }]],
			},
			readToken: token,
			dryRun: true,
		})) as { dryRun: boolean; diff: { before: string | null; after: string | null } };
		expect(result.dryRun).toBe(true);
		expect(result.diff.before).toContain('最初の見出し');
		expect(result.diff.after).toContain('preview');
		const after = await fs.readFile(path.join(fixture.docRoot, 'about.html'), 'utf8');
		expect(after).toBe(before);
	});

	test('block_move dryRun diff has a non-null before (the block did exist, just at a different index)', async () => {
		const token = await readToken();
		const result = (await blockMoveTool.run(fixture.ctx, {
			path: 'about.html',
			target: { index: 0 },
			to: 1,
			readToken: token,
			dryRun: true,
		})) as { diff: { before: string | null; after: string | null } };
		expect(result.diff.before).toContain('最初の見出し');
		expect(result.diff.after).toContain('最初の見出し');
	});

	test('block_insert dryRun diff has before=null (nothing existed there yet)', async () => {
		const token = await readToken();
		const result = (await blockInsertTool.run(fixture.ctx, {
			path: 'about.html',
			index: 0,
			spec: { catalog: 'h2', items: [[{ name: 'title-h2', data: { titleH2: 'new' } }]] },
			readToken: token,
			dryRun: true,
		})) as { diff: { before: string | null; after: string | null } };
		expect(result.diff.before).toBeNull();
		expect(result.diff.after).toContain('new');
	});

	test('block_delete dryRun diff has after=null (nothing remains there)', async () => {
		const token = await readToken();
		const result = (await blockDeleteTool.run(fixture.ctx, {
			path: 'about.html',
			target: { index: 0 },
			readToken: token,
			dryRun: true,
		})) as { diff: { before: string | null; after: string | null } };
		expect(result.diff.before).toContain('最初の見出し');
		expect(result.diff.after).toBeNull();
	});
});

describe('block_ensure_id', () => {
	test('is idempotent and ids are stable full DOM ids usable as a target afterward', async () => {
		const token1 = await readToken();
		const first = (await blockEnsureIdTool.run(fixture.ctx, {
			path: 'about.html',
			target: { index: 0 },
			readToken: token1,
		})) as { id: string; created: boolean; readToken: string };
		expect(first.created).toBe(true);
		expect(first.id).toMatch(/^bge-\d+$/);

		const second = (await blockEnsureIdTool.run(fixture.ctx, {
			path: 'about.html',
			target: { index: 0 },
			readToken: first.readToken,
		})) as { id: string; created: boolean; readToken: string };
		expect(second.created).toBe(false);
		expect(second.id).toBe(first.id);

		const got = await blockGetTool.run(fixture.ctx, {
			path: 'about.html',
			target: { id: first.id },
			readToken: second.readToken,
		});
		expect(got).toMatchObject({ block: { data: { name: 'h2' } } });
	});
});

describe('page_update', () => {
	test('rejects without a readToken', async () => {
		const error = await pageUpdateTool
			.run(fixture.ctx, { path: 'about.html', ops: [{ op: 'delete', index: 0 }] })
			.catch((error_: unknown) => error_);
		expect(error).toBeInstanceOf(AgentError);
		expect((error as AgentError).code).toBe('read-required');
	});

	test('applies every op in the batch, in order, and returns applied === ops.length + a fresh readToken', async () => {
		const token = await readToken();
		// Original blocks: [h2, wysiwyg]. delete(0) -> [wysiwyg]; duplicate(0) -> [wysiwyg, wysiwyg-copy].
		const result = (await pageUpdateTool.run(fixture.ctx, {
			path: 'about.html',
			ops: [
				{ op: 'delete', index: 0 },
				{ op: 'duplicate', index: 0 },
			],
			readToken: token,
		})) as { applied: number; dryRun: boolean; readToken: string; appliedTo: string };
		expect(result).toMatchObject({ applied: 2, dryRun: false, appliedTo: 'disk' });
		expect(typeof result.readToken).toBe('string');

		const blocks = await h.readBlocks(fixture.ctx, 'about.html');
		expect(blocks.map((b) => b.data.name)).toEqual(['wysiwyg', 'wysiwyg']);
	});

	test('a failing op rejects the whole call and persists nothing — all-or-nothing, not partial', async () => {
		const before = await fs.readFile(path.join(fixture.docRoot, 'about.html'), 'utf8');
		const token = await readToken();
		const error = await pageUpdateTool
			.run(fixture.ctx, {
				path: 'about.html',
				ops: [
					{ op: 'delete', index: 0 }, // succeeds in memory
					{ op: 'delete', index: 99 }, // out of range — fails
				],
				readToken: token,
			})
			.catch((error_: unknown) => error_);
		expect(error).toBeInstanceOf(AgentError);
		expect((error as AgentError).message).toContain('op 1');
		// Nothing persisted — not even the first (in-memory-successful) op.
		const after = await fs.readFile(path.join(fixture.docRoot, 'about.html'), 'utf8');
		expect(after).toBe(before);
	});

	test('dryRun returns a page-level diff and does not write to disk', async () => {
		const before = await fs.readFile(path.join(fixture.docRoot, 'about.html'), 'utf8');
		const token = await readToken();
		const result = (await pageUpdateTool.run(fixture.ctx, {
			path: 'about.html',
			ops: [{ op: 'delete', index: 0 }],
			readToken: token,
			dryRun: true,
		})) as { dryRun: boolean; diff: { before: string; after: string } };
		expect(result.dryRun).toBe(true);
		expect(result.diff.before).toContain('最初の見出し');
		expect(result.diff.after).not.toContain('最初の見出し');
		expect(result.diff.after).toContain('本文1');
		const after = await fs.readFile(path.join(fixture.docRoot, 'about.html'), 'utf8');
		expect(after).toBe(before);
	});
});
