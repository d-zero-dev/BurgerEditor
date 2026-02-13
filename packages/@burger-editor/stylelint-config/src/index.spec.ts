import { describe, expect, test } from 'vitest';
import stylelint from 'stylelint';

import config from './index.js';

async function lint(code: string) {
	const result = await stylelint.lint({
		code,
		config: {
			...config,
			// Disable other rules to focus on our rule
			rules: {
				...config.rules,
			},
		},
	});
	return result;
}

describe('@burger-editor/no-internal-selector', () => {
	describe('rejects BurgerEditor internal attribute selectors', () => {
		test('[data-bge]', async () => {
			const result = await lint('[data-bge] { color: red; }');
			expect(result.results[0].warnings).toHaveLength(1);
			expect(result.results[0].warnings[0].rule).toBe('@burger-editor/no-internal-selector');
			expect(result.results[0].warnings[0].text).toContain('data-bge');
		});

		test('[data-bge="value"]', async () => {
			const result = await lint('[data-bge="link"] { color: red; }');
			expect(result.results[0].warnings).toHaveLength(1);
			expect(result.results[0].warnings[0].rule).toBe('@burger-editor/no-internal-selector');
		});

		test('[data-bge-container]', async () => {
			const result = await lint('[data-bge-container] { display: grid; }');
			expect(result.results[0].warnings).toHaveLength(1);
			expect(result.results[0].warnings[0].text).toContain('data-bge-container');
		});

		test('[data-bge-item]', async () => {
			const result = await lint('[data-bge-item] { margin: 0; }');
			expect(result.results[0].warnings).toHaveLength(1);
			expect(result.results[0].warnings[0].text).toContain('data-bge-item');
		});

		test('[data-bge-name]', async () => {
			const result = await lint('[data-bge-name="hero"] { padding: 10px; }');
			expect(result.results[0].warnings).toHaveLength(1);
			expect(result.results[0].warnings[0].text).toContain('data-bge-name');
		});

		test('[data-bge-group]', async () => {
			const result = await lint('[data-bge-group] { gap: 1rem; }');
			expect(result.results[0].warnings).toHaveLength(1);
		});

		test('[data-bge-linkarea]', async () => {
			const result = await lint('[data-bge-linkarea] { cursor: pointer; }');
			expect(result.results[0].warnings).toHaveLength(1);
		});

		test('[data-bge-list]', async () => {
			const result = await lint('[data-bge-list] { list-style: none; }');
			expect(result.results[0].warnings).toHaveLength(1);
		});

		test('[data-bge-mode]', async () => {
			const result = await lint('[data-bge-mode] { border: 1px solid; }');
			expect(result.results[0].warnings).toHaveLength(1);
		});
	});

	describe('rejects BurgerEditor item attributes', () => {
		test('[data-bgi]', async () => {
			const result = await lint('[data-bgi] { color: blue; }');
			expect(result.results[0].warnings).toHaveLength(1);
			expect(result.results[0].warnings[0].text).toContain('data-bgi');
		});

		test('[data-bgi="item-name"]', async () => {
			const result = await lint('[data-bgi="button"] { background: red; }');
			expect(result.results[0].warnings).toHaveLength(1);
		});

		test('[data-bgi-ver]', async () => {
			const result = await lint('[data-bgi-ver] { opacity: 0.5; }');
			expect(result.results[0].warnings).toHaveLength(1);
		});
	});

	describe('rejects BurgerEditor component attributes', () => {
		test('[data-bgc-flex-box]', async () => {
			const result = await lint('[data-bgc-flex-box] { display: flex; }');
			expect(result.results[0].warnings).toHaveLength(1);
			expect(result.results[0].warnings[0].text).toContain('data-bgc-flex-box');
		});

		test('[data-bgc-align]', async () => {
			const result = await lint('[data-bgc-align] { text-align: center; }');
			expect(result.results[0].warnings).toHaveLength(1);
		});
	});

	describe('rejects BurgerEditor custom element type selectors', () => {
		test('bge-wysiwyg', async () => {
			const result = await lint('bge-wysiwyg { color: red; }');
			expect(result.results[0].warnings).toHaveLength(1);
			expect(result.results[0].warnings[0].text).toContain('bge-wysiwyg');
		});

		test('bge-option', async () => {
			const result = await lint('bge-option { display: none; }');
			expect(result.results[0].warnings).toHaveLength(1);
			expect(result.results[0].warnings[0].text).toContain('bge-option');
		});
	});

	describe('rejects in complex selectors', () => {
		test('.my-class [data-bge]', async () => {
			const result = await lint('.my-class [data-bge] { color: red; }');
			expect(result.results[0].warnings).toHaveLength(1);
		});

		test('div > [data-bge-container] > span', async () => {
			const result = await lint('div > [data-bge-container] > span { color: red; }');
			expect(result.results[0].warnings).toHaveLength(1);
		});

		test('multiple internal selectors in one rule', async () => {
			const result = await lint('[data-bge] [data-bgi] { color: red; }');
			expect(result.results[0].warnings).toHaveLength(2);
		});

		test('selector list with internal selector', async () => {
			const result = await lint('.ok, [data-bge] { color: red; }');
			expect(result.results[0].warnings).toHaveLength(1);
		});
	});

	describe('allows non-BurgerEditor selectors', () => {
		test('regular class selector', async () => {
			const result = await lint('.my-class { color: red; }');
			expect(result.results[0].warnings).toHaveLength(0);
		});

		test('regular id selector', async () => {
			const result = await lint('#my-id { color: red; }');
			expect(result.results[0].warnings).toHaveLength(0);
		});

		test('regular element selector', async () => {
			const result = await lint('div { color: red; }');
			expect(result.results[0].warnings).toHaveLength(0);
		});

		test('regular attribute selector', async () => {
			const result = await lint('[data-custom] { color: red; }');
			expect(result.results[0].warnings).toHaveLength(0);
		});

		test('data-other attribute', async () => {
			const result = await lint('[data-other] { color: red; }');
			expect(result.results[0].warnings).toHaveLength(0);
		});

		test('regular custom element', async () => {
			const result = await lint('my-component { color: red; }');
			expect(result.results[0].warnings).toHaveLength(0);
		});

		test('attribute starting with data-bg but not data-bge/bgi/bgc', async () => {
			const result = await lint('[data-bg] { color: red; }');
			expect(result.results[0].warnings).toHaveLength(0);
		});

		test('attribute data-bgx (not e, i, or c)', async () => {
			const result = await lint('[data-bgx] { color: red; }');
			expect(result.results[0].warnings).toHaveLength(0);
		});
	});
});
