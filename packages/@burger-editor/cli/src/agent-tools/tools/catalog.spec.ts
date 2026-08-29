// dom-shim side-effect — must come before any handler call that touches DOMParser.
import '@burger-editor/file-io';

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { type AgentToolFixture, makeFixture } from '../__tests__/fixture.js';

import {
	catalogGetTool,
	catalogListTool,
	containerOptionsListTool,
	itemListTool,
	itemSchemaTool,
	styleOptionsListTool,
} from './catalog.js';

let fixture: AgentToolFixture;

beforeEach(async () => {
	fixture = await makeFixture();
});

afterEach(async () => {
	await fixture.tmp[Symbol.asyncDispose]();
});

// Smoke tests: each read-only catalog/item/style tool wrapper passes its zod
// input schema and returns the underlying handler's response shape — the
// handlers themselves are covered in handlers.spec.ts, but the agent-tools
// wrapper (schema + run() plumbing) was previously untested.
describe('catalog / item / style tool wrappers', () => {
	test('catalog_list returns at least one catalog entry', async () => {
		const result = (await catalogListTool.run(fixture.ctx, {})) as {
			catalogs: Array<{ name: string }>;
		};
		expect(result.catalogs.length).toBeGreaterThan(0);
	});

	test('catalog_get returns a ready-to-insert template for a known catalog name', async () => {
		const result = (await catalogGetTool.run(fixture.ctx, { name: 'h2' })) as {
			template: { catalog: string };
		};
		expect(result.template.catalog).toBe('h2');
	});

	test('catalog_get rejects an unknown catalog name', async () => {
		await expect(
			catalogGetTool.run(fixture.ctx, { name: 'no-such-catalog' }),
		).rejects.toThrow(/Unknown catalog block name/);
	});

	test('item_list includes the standard item names', async () => {
		const result = (await itemListTool.run(fixture.ctx, {})) as { items: string[] };
		expect(result.items).toContain('title-h2');
	});

	test('item_schema returns dataKeys for a known item', async () => {
		const result = (await itemSchemaTool.run(fixture.ctx, { name: 'title-h2' })) as {
			dataKeys: string[];
		};
		expect(result.dataKeys).toEqual(['titleH2']);
	});

	test('style_options_list returns an empty axes record when no stylesheets are configured', async () => {
		const result = (await styleOptionsListTool.run(fixture.ctx, {})) as {
			axes: Record<string, string[]>;
		};
		expect(result.axes).toEqual({});
	});

	test('container_options_list returns the static grid/inline/float vocabulary', async () => {
		const result = (await containerOptionsListTool.run(fixture.ctx, {})) as {
			types: string[];
		};
		expect(result.types).toEqual(['grid', 'inline', 'float']);
	});
});
