import { describe, expect, test } from 'vitest';
import stylelint from 'stylelint';

import config from './index.js';
import plugin from './plugin.js';

async function lint(code: string) {
	const result = await stylelint.lint({
		code,
		config: {
			...config,
			rules: {
				...config.rules,
			},
		},
	});
	return result;
}

async function lintWithOptions(code: string, ruleOptions: unknown) {
	const result = await stylelint.lint({
		code,
		config: {
			plugins: [plugin],
			rules: {
				'@burger-editor/no-internal-selector': ruleOptions,
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

	describe('rejects @scope with internal selectors', () => {
		test('@scope ([data-bge]) in prelude', async () => {
			const result = await lint('@scope ([data-bge]) { .child { color: red; } }');
			expect(result.results[0].warnings).toHaveLength(1);
			expect(result.results[0].warnings[0].text).toContain('data-bge');
		});

		test('@scope with bge-* type selector in prelude', async () => {
			const result = await lint('@scope (bge-wysiwyg) { p { color: red; } }');
			expect(result.results[0].warnings).toHaveLength(1);
			expect(result.results[0].warnings[0].text).toContain('bge-wysiwyg');
		});

		test('@scope with internal selector inside body', async () => {
			const result = await lint('@scope (.root) { [data-bge] { color: red; } }');
			expect(result.results[0].warnings).toHaveLength(1);
			expect(result.results[0].warnings[0].text).toContain('data-bge');
		});

		test('@scope root flagged but limit allowed', async () => {
			const result = await lint(
				'@scope ([data-bge]) to ([data-bgi]) { .child { color: red; } }',
			);
			// root [data-bge] is flagged, but limit [data-bgi] is allowed
			expect(result.results[0].warnings).toHaveLength(1);
			expect(result.results[0].warnings[0].text).toContain('data-bge');
		});

		test('@scope limit with internal selector is allowed', async () => {
			const result = await lint('@scope (.root) to ([data-bge-item]) { .child { color: red; } }');
			expect(result.results[0].warnings).toHaveLength(0);
		});

		test('@scope with safe selectors passes', async () => {
			const result = await lint('@scope (.my-scope) to (.limit) { .child { color: red; } }');
			expect(result.results[0].warnings).toHaveLength(0);
		});
	});

	describe('rejects internal selectors in nested at-rules', () => {
		test('@media with nested internal selector', async () => {
			const result = await lint('@media (width >= 768px) { [data-bge] { color: red; } }');
			expect(result.results[0].warnings).toHaveLength(1);
			expect(result.results[0].warnings[0].text).toContain('data-bge');
		});

		test('@supports with nested internal selector', async () => {
			const result = await lint(
				'@supports (display: grid) { [data-bge-container] { display: grid; } }',
			);
			expect(result.results[0].warnings).toHaveLength(1);
		});

		test('@layer with nested internal selector', async () => {
			const result = await lint('@layer base { [data-bgi] { margin: 0; } }');
			expect(result.results[0].warnings).toHaveLength(1);
		});

		test('@container with nested internal selector', async () => {
			const result = await lint(
				'@container sidebar (min-width: 400px) { [data-bge] { font-size: 1.5rem; } }',
			);
			expect(result.results[0].warnings).toHaveLength(1);
		});

		test('deeply nested at-rules', async () => {
			const result = await lint(
				'@media (width >= 768px) { @layer base { [data-bge] { display: grid; } } }',
			);
			expect(result.results[0].warnings).toHaveLength(1);
		});

		test('CSS nesting with internal selector', async () => {
			const result = await lint('.parent { [data-bge] { color: red; } }');
			expect(result.results[0].warnings).toHaveLength(1);
		});

		test('nested at-rules with safe selectors pass', async () => {
			const result = await lint('@media (width >= 768px) { .safe { color: red; } }');
			expect(result.results[0].warnings).toHaveLength(0);
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

	describe('custom options: disallowedAttrPatterns', () => {
		test('custom attr pattern replaces defaults', async () => {
			const result = await lintWithOptions('[data-bge] { color: red; }', [
				true,
				{ disallowedAttrPatterns: ['/^data-custom/'] },
			]);
			// data-bge should NOT be flagged since custom pattern replaces defaults
			expect(result.results[0].warnings).toHaveLength(0);
		});

		test('custom attr pattern matches', async () => {
			const result = await lintWithOptions('[data-custom-foo] { color: red; }', [
				true,
				{ disallowedAttrPatterns: ['/^data-custom/'] },
			]);
			expect(result.results[0].warnings).toHaveLength(1);
			expect(result.results[0].warnings[0].text).toContain('data-custom-foo');
		});

		test('multiple custom attr patterns', async () => {
			const result = await lintWithOptions(
				'[data-bge] { color: red; } [data-foo] { color: blue; }',
				[true, { disallowedAttrPatterns: ['/^data-bge/', '/^data-foo/'] }],
			);
			expect(result.results[0].warnings).toHaveLength(2);
		});
	});

	describe('custom options: disallowedTypePatterns', () => {
		test('custom type pattern replaces defaults', async () => {
			const result = await lintWithOptions('bge-wysiwyg { color: red; }', [
				true,
				{ disallowedTypePatterns: ['/^x-/'] },
			]);
			// bge-wysiwyg should NOT be flagged since custom pattern replaces defaults
			expect(result.results[0].warnings).toHaveLength(0);
		});

		test('custom type pattern matches', async () => {
			const result = await lintWithOptions('x-internal { color: red; }', [
				true,
				{ disallowedTypePatterns: ['/^x-/'] },
			]);
			expect(result.results[0].warnings).toHaveLength(1);
			expect(result.results[0].warnings[0].text).toContain('x-internal');
		});
	});

	describe('custom options: combined', () => {
		test('custom attr + type patterns together', async () => {
			const result = await lintWithOptions(
				'x-comp [data-internal] { color: red; }',
				[
					true,
					{
						disallowedAttrPatterns: ['/^data-internal/'],
						disallowedTypePatterns: ['/^x-/'],
					},
				],
			);
			expect(result.results[0].warnings).toHaveLength(2);
		});

		test('custom patterns with @scope root', async () => {
			const result = await lintWithOptions(
				'@scope ([data-internal]) { x-comp { color: red; } }',
				[
					true,
					{
						disallowedAttrPatterns: ['/^data-internal/'],
						disallowedTypePatterns: ['/^x-/'],
					},
				],
			);
			// 1 from @scope root + 1 from body rule
			expect(result.results[0].warnings).toHaveLength(2);
		});

		test('custom patterns with @scope limit are allowed', async () => {
			const result = await lintWithOptions(
				'@scope (.safe) to ([data-internal]) { .child { color: red; } }',
				[
					true,
					{
						disallowedAttrPatterns: ['/^data-internal/'],
					},
				],
			);
			// limit is allowed
			expect(result.results[0].warnings).toHaveLength(0);
		});
	});
});
