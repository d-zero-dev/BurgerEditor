// dom-shim side-effect — must come before any handler call that touches DOMParser.
import '@burger-editor/file-io';

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { type AgentToolFixture, makeFixture } from '../__tests__/fixture.js';
import { AgentError } from '../errors.js';

import { frontMatterGetTool, frontMatterSetTool } from './front-matter.js';
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

describe('front_matter_get', () => {
	test('returns the parsed Front Matter without needing a readToken', async () => {
		const result = (await frontMatterGetTool.run(fixture.ctx, {
			path: 'about.html',
		})) as {
			frontMatter: { title: string };
		};
		expect(result.frontMatter.title).toBe('Test Page');
	});
});

describe('front_matter_set', () => {
	test('rejects without a readToken', async () => {
		const error = await frontMatterSetTool
			.run(fixture.ctx, { path: 'about.html', patch: { description: 'x' } })
			.catch((error_: unknown) => error_);
		expect(error).toBeInstanceOf(AgentError);
		expect((error as AgentError).code).toBe('read-required');
	});

	test('merges the patch by default and returns a fresh readToken', async () => {
		const token = await readToken();
		const result = (await frontMatterSetTool.run(fixture.ctx, {
			path: 'about.html',
			patch: { description: 'desc' },
			readToken: token,
		})) as { frontMatter: { title: string; description: string }; readToken: string };
		expect(result.frontMatter).toEqual({ title: 'Test Page', description: 'desc' });
		expect(typeof result.readToken).toBe('string');
	});

	test('replace: true overwrites the Front Matter entirely', async () => {
		const token = await readToken();
		const result = (await frontMatterSetTool.run(fixture.ctx, {
			path: 'about.html',
			patch: { description: 'only-this' },
			replace: true,
			readToken: token,
		})) as { frontMatter: Record<string, unknown> };
		expect(result.frontMatter).toEqual({ description: 'only-this' });
	});
});
