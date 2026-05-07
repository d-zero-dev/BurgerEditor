import { describe, expect, test } from 'vitest';

import { Nav } from './nav.js';

/**
 * SSR strings used by hono/jsx are async (Promise<string>) when nested. The
 * Nav component itself is synchronous, but to be future-proof we resolve via
 * `String(await result)` consistently.
 * @param node
 */
async function ssr(node: unknown): Promise<string> {
	return String(await node);
}

describe('Nav SSR', () => {
	test('renders a path input always, with required attribute', async () => {
		const html = await ssr(Nav({ virtualTreeEnabled: false }));
		expect(html).toContain('name="path"');
		expect(html).toMatch(/name="path"[^>]*required/);
	});

	test('renders the id input when virtualTreeEnabled is true', async () => {
		const html = await ssr(Nav({ virtualTreeEnabled: true }));
		expect(html).toContain('name="id"');
	});

	test('omits the id input when virtualTreeEnabled is false', async () => {
		const html = await ssr(Nav({ virtualTreeEnabled: false }));
		expect(html).not.toContain('name="id"');
	});

	test('always provides a #nav-tree-mount placeholder for client hydration', async () => {
		const html = await ssr(Nav({ virtualTreeEnabled: false }));
		expect(html).toContain('id="nav-tree-mount"');
	});
});
