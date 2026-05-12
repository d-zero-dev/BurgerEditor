import { describe, expect, test } from 'vitest';

import { NoEditableAreaError } from '../helpers/no-editable-area-error.js';

import { App } from './app.js';

/**
 *
 * @param node
 */
async function ssr(node: unknown): Promise<string> {
	return String(await node);
}

describe('App SSR', () => {
	test('renders the virtual-tree-enabled flag in the OK content path', async () => {
		const html = await ssr(
			App({
				path: '/x.html',
				content: '<h1>x</h1>',
				lang: 'en',
				virtualTreeEnabled: true,
			}),
		);
		expect(html).toContain('id="virtual-tree-enabled"');
		expect(html).toContain('value="true"');
	});

	test('still renders the virtual-tree-enabled flag when content is an Error (regression)', async () => {
		// Regression: this hidden input used to live inside the non-error branch,
		// so error pages silently degraded the new-file dialog to non-virtual mode.
		const html = await ssr(
			App({
				path: '/x.html',
				content: new NoEditableAreaError('body'),
				lang: 'en',
				virtualTreeEnabled: true,
			}),
		);
		expect(html).toContain('id="virtual-tree-enabled"');
		expect(html).toContain('value="true"');
	});

	test('renders value="false" when virtualTree is disabled', async () => {
		const html = await ssr(
			App({
				path: '/x.html',
				content: '<h1>x</h1>',
				lang: 'en',
				virtualTreeEnabled: false,
			}),
		);
		expect(html).toMatch(/id="virtual-tree-enabled"[^>]*value="false"/);
	});

	test('skips editor-specific hidden inputs in the Error path', async () => {
		const html = await ssr(
			App({
				path: '/x.html',
				content: new NoEditableAreaError('body'),
				lang: 'en',
				virtualTreeEnabled: false,
			}),
		);
		// editor-only state should be absent on error pages
		expect(html).not.toContain('id="main"');
		expect(html).not.toContain('id="front-matter"');
	});

	test('passes virtualTreeEnabled through to <Nav>', async () => {
		// If Nav stops respecting the prop, the dialog id input goes missing.
		const enabled = await ssr(
			App({
				path: '/x.html',
				content: '<h1>x</h1>',
				lang: 'en',
				virtualTreeEnabled: true,
			}),
		);
		const disabled = await ssr(
			App({
				path: '/x.html',
				content: '<h1>x</h1>',
				lang: 'en',
				virtualTreeEnabled: false,
			}),
		);
		expect(enabled).toContain('name="id"');
		expect(disabled).not.toContain('name="id"');
	});
});
