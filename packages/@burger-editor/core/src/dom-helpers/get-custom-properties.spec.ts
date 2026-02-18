import { test, expect, describe, beforeEach } from 'vitest';

import { getCustomProperties, getCustomProperty } from './get-custom-properties.js';

beforeEach(() => {
	document.head.innerHTML = '';
});

/**
 *
 * @param result
 */
function toObject(result: ReturnType<typeof getCustomProperties>) {
	return Object.fromEntries(
		[...result.entries()].map(([key, map]) => [
			key,
			{
				id: map.id,
				name: map.name,
				properties: Object.fromEntries(map.properties.entries()),
			},
		]),
	);
}

test('getCustomProperties', () => {
	const style = document.createElement('style');
	style.textContent = `
		[data-bge-container] {
			font-size: 100%;

			/* Custom width */
			--bge-options-width--normal: calc(800 / 16 * 1rem);
			--bge-options-width--small: calc(400 / 16 * 1rem);
			--bge-options-width--medium: calc(600 / 16 * 1rem);
			--bge-options-width--large: calc(1200 / 16 * 1rem);
			--bge-options-width--full: 100dvi;
			--bge-options-width: var(--bge-options-width--normal);

			/* Custom margin */
			--bge-options-margin--normal: 3rem;
			--bge-options-margin--none: 0;
			--bge-options-margin--small: 1rem;
			--bge-options-margin--large: 8rem;
			--bge-options-margin: var(--bge-options-margin--normal);

			/* Custom background color */
			--bge-options-bgcolor--transparent: transparent;
			--bge-options-bgcolor--white: #fff;
			--bge-options-bgcolor--gray: #dfdfdf;
			--bge-options-bgcolor--blue: #eaf3f8;
			--bge-options-bgcolor--red: #fcc;
			--bge-options-bgcolor: var(--bge-options-bgcolor--transparent);

			/* Custom border style */
			--bge-options-border--none: none;
			--bge-options-border--solid: solid 1px currentColor;
			--bge-options-border--dashed: dashed 1px currentColor;
			--bge-options-border--dotted: dotted 1px currentColor;
			--bge-options-border--wide: solid 3px currentColor;
			--bge-options-border: var(--bge-options-border--none);
		}
	`;
	document.head.append(style);

	const result = getCustomProperties(document);

	const resultObj = toObject(result);

	expect(resultObj).toMatchObject({
		width: {
			id: 'width',
			name: 'width',
			properties: {
				normal: {
					isDefault: true,
					value: 'calc(800 / 16 * 1rem)',
					priority: [],
				},
				small: {
					isDefault: false,
					value: 'calc(400 / 16 * 1rem)',
					priority: [],
				},
				medium: {
					isDefault: false,
					value: 'calc(600 / 16 * 1rem)',
					priority: [],
				},
				large: {
					isDefault: false,
					value: 'calc(1200 / 16 * 1rem)',
					priority: [],
				},
				full: {
					isDefault: false,
					value: '100dvi',
					priority: [],
				},
			},
		},
		margin: {
			id: 'margin',
			name: 'margin',
			properties: {
				normal: {
					isDefault: true,
					value: '3rem',
				},
				none: {
					isDefault: false,
					value: '0',
				},
				small: {
					isDefault: false,
					value: '1rem',
				},
				large: {
					isDefault: false,
					value: '8rem',
				},
			},
		},
		bgcolor: {
			id: 'bgcolor',
			name: 'bgcolor',
			properties: {
				transparent: {
					isDefault: true,
					value: 'transparent',
				},
				white: {
					isDefault: false,
					value: '#fff',
				},
				gray: {
					isDefault: false,
					value: '#dfdfdf',
				},
				blue: {
					isDefault: false,
					value: '#eaf3f8',
				},
				red: {
					isDefault: false,
					value: '#fcc',
				},
			},
		},
		border: {
			id: 'border',
			name: 'border',
			properties: {
				none: {
					isDefault: true,
					value: 'none',
				},
				solid: {
					isDefault: false,
					value: 'solid 1px currentColor',
				},
				dashed: {
					isDefault: false,
					value: 'dashed 1px currentColor',
				},
				dotted: {
					isDefault: false,
					value: 'dotted 1px currentColor',
				},
				wide: {
					isDefault: false,
					value: 'solid 3px currentColor',
				},
			},
		},
	});
});

describe('Deep scope', () => {
	test('Nested scope', () => {
		const style = document.createElement('style');
		style.textContent = `
			[data-bge-container] {
				--bge-options-width--a: 100%;
				--bge-options-width: var(--bge-options-width--a);
			}

			.custom-class-bge-local {
				[data-bge-container] {
					--bge-options-width--a: 200%;

					@container bge-container (width < 600px) {
						--bge-options-width--a: 300%;
					}
				}

				@media (width < 600px) {
					[data-bge-container] {
						--bge-options-width--a: 400%;
					}
				}

				@container bge-container (width < 600px) {
					[data-bge-container] {
						--bge-options-width--a: 500%;
					}
				}

				@supports (container-name: bge-container) {
					[data-bge-container] {
						--bge-options-width--a: 600%;
					}
				}

				@scope (scope root) to (scope limit) {
					[data-bge-container] {
						--bge-options-width--a: 700%;
					}
				}
			}
		`;
		document.head.append(style);

		const result = getCustomProperties(document);

		const resultObj = toObject(result);

		expect(resultObj).toMatchObject({
			width: {
				id: 'width',
				name: 'width',
				properties: {
					a: {
						isDefault: true,
						value: '700%',
					},
				},
			},
		});
	});
});

describe('Layers', () => {
	test('Nested layers', () => {
		const style = document.createElement('style');
		style.textContent = `
			@layer a {
				[data-bge-container] {
					--bge-options-width--a: 100%;
					--bge-options-width: var(--bge-options-width--a);
				}
			}
		`;
		document.head.append(style);

		const result = getCustomProperties(document);

		const resultObj = toObject(result);

		expect(resultObj).toMatchObject({
			width: {
				id: 'width',
				name: 'width',
				properties: {
					a: {
						isDefault: true,
						value: '100%',
						priority: [1],
					},
				},
			},
		});
	});

	test('Nested layers with layer statement inside parent', () => {
		const style = document.createElement('style');
		style.textContent = `
			@layer a {
				@layer b {
					[data-bge-container] {
						--bge-options-width--a: 200%;
						--bge-options-width: var(--bge-options-width--a);
					}
				}

				@layer c {
					[data-bge-container] {
						--bge-options-width--a: 100%;
						--bge-options-width: var(--bge-options-width--a);
					}
				}

				@layer c, b;
			}
		`;
		document.head.append(style);

		const result = getCustomProperties(document);

		const resultObj = toObject(result);

		expect(resultObj).toMatchObject({
			width: {
				id: 'width',
				name: 'width',
				properties: {
					a: {
						isDefault: true,
						value: '200%',
					},
				},
			},
		});
	});

	test('Unlayered rules override layered rules', () => {
		const style = document.createElement('style');
		style.textContent = `
			[data-bge-container] {
				--bge-options-width--a: 300%;
				--bge-options-width: var(--bge-options-width--a);
			}

			@layer a {
				@layer b {
					[data-bge-container] {
						--bge-options-width--a: 200%;
						--bge-options-width: var(--bge-options-width--a);
					}
				}
				
				@layer c {
					[data-bge-container] {
						--bge-options-width--a: 100%;
						--bge-options-width: var(--bge-options-width--a);
					}
				}

				@layer c, b;
			}
		`;
		document.head.append(style);

		const result = getCustomProperties(document);

		const resultObj = toObject(result);

		expect(resultObj).toMatchObject({
			width: {
				id: 'width',
				name: 'width',
				properties: {
					a: {
						isDefault: true,
						value: '300%',
					},
				},
			},
		});
	});

	test('Cross-layer priority with nested sub-layers', () => {
		const style = document.createElement('style');
		style.textContent = `
			@layer a, b;

			@layer a {
				[data-bge-container] {
					--bge-options-width--a: 300%;
					--bge-options-width: var(--bge-options-width--a);
				}
			}

			@layer b {
				@layer c {
					[data-bge-container] {
						--bge-options-width--a: 200%;
						--bge-options-width: var(--bge-options-width--a);
					}
				}
				
				@layer d {
					[data-bge-container] {
						--bge-options-width--a: 100%;
						--bge-options-width: var(--bge-options-width--a);
					}
				}

				@layer c, d;
			}
		`;
		document.head.append(style);

		const result = getCustomProperties(document);

		const resultObj = toObject(result);

		expect(resultObj).toMatchObject({
			width: {
				id: 'width',
				name: 'width',
				properties: {
					a: {
						isDefault: true,
						value: '100%',
					},
				},
			},
		});
	});

	test('Reversed layer statement changes default', () => {
		const style = document.createElement('style');
		style.textContent = `
			@layer b, a;

			@layer a {
				[data-bge-container] {
					--bge-options-width--a: 100%;
					--bge-options-width--b: 200%;
					--bge-options-width: var(--bge-options-width--a);
				}
			}

			@layer b {
				[data-bge-container] {
					--bge-options-width--a: 100%;
					--bge-options-width--b: 200%;
					--bge-options-width: var(--bge-options-width--b);
				}
			}
		`;
		document.head.append(style);

		const result = getCustomProperties(document);

		const resultObj = toObject(result);

		expect(resultObj).toMatchObject({
			width: {
				id: 'width',
				name: 'width',
				properties: {
					a: {
						isDefault: true,
						value: '100%',
					},
					b: {
						isDefault: false,
						value: '200%',
					},
				},
			},
		});
	});

	test('Layer statement order determines priority', () => {
		const style = document.createElement('style');
		style.textContent = `
			@layer a, b;

			@layer a {
				[data-bge-container] {
					--bge-options-width--a: 100%;
					--bge-options-width--b: 200%;
					--bge-options-width: var(--bge-options-width--a);
				}
			}

			@layer b {
				[data-bge-container] {
					--bge-options-width--a: 100%;
					--bge-options-width--b: 200%;
					--bge-options-width: var(--bge-options-width--b);
				}
			}
		`;
		document.head.append(style);

		const result = getCustomProperties(document);

		const resultObj = toObject(result);

		expect(resultObj).toMatchObject({
			width: {
				id: 'width',
				name: 'width',
				properties: {
					a: {
						isDefault: false,
						value: '100%',
					},
					b: {
						isDefault: true,
						value: '200%',
					},
				},
			},
		});
	});
});

describe('Layer priority edge cases', () => {
	test('Undeclared layer is ordered after declared layers per CSS spec', () => {
		const style = document.createElement('style');
		style.textContent = `
			@layer a, b;
			@layer c {
				[data-bge-container] {
					--bge-options-width--x: 100%;
					--bge-options-width: var(--bge-options-width--x);
				}
			}
			@layer b {
				[data-bge-container] {
					--bge-options-width--x: 200%;
					--bge-options-width: var(--bge-options-width--x);
				}
			}
		`;
		document.head.append(style);
		const result = getCustomProperties(document);
		const resultObj = toObject(result);
		// CSS spec: c is first encountered after @layer a, b; → order: a < b < c
		// c has highest priority → 100% wins
		expect(resultObj.width.properties.x.value).toBe('100%');
	});

	test('Multiple separate @layer statements establish global order', () => {
		const style = document.createElement('style');
		style.textContent = `
			@layer c;
			@layer a, b;

			@layer a { [data-bge-container] { --bge-options-width--x: 100%; } }
			@layer b { [data-bge-container] { --bge-options-width--x: 200%; } }
			@layer c { [data-bge-container] { --bge-options-width--x: 300%; } }
		`;
		document.head.append(style);
		const result = getCustomProperties(document);
		const resultObj = toObject(result);
		// Order: c < a < b → b has highest priority
		expect(resultObj.width.properties.x.value).toBe('200%');
	});
});

describe('type', () => {
	test('type', () => {
		const style = document.createElement('style');
		style.textContent = `
			[data-bge-container] {
				--bge-options-_grid_foo--default: 1;
				--bge-options-_grid_foo: var(--bge-options-_grid_foo--default);

				--bge-options-_inline_bar--default: 2;
				--bge-options-_inline_bar: var(--bge-options-_inline_bar--default);

				--bge-options-_float_baz--default: 3;
				--bge-options-_float_baz: var(--bge-options-_float_baz--default);
			}
		`;
		document.head.append(style);

		const resultGrid = getCustomProperties(document, 'grid');
		const resultInline = getCustomProperties(document, 'inline');
		const resultFloat = getCustomProperties(document, 'float');

		const resultObj = {
			...toObject(resultGrid),
			...toObject(resultInline),
			...toObject(resultFloat),
		};

		expect(resultObj).toMatchObject({
			_grid_foo: {
				id: '_grid_foo',
				name: 'foo',
				properties: {
					default: {
						isDefault: true,
						value: '1',
					},
				},
			},
			_inline_bar: {
				id: '_inline_bar',
				name: 'bar',
				properties: {
					default: {
						isDefault: true,
						value: '2',
					},
				},
			},
			_float_baz: {
				id: '_float_baz',
				name: 'baz',
				properties: {
					default: {
						isDefault: true,
						value: '3',
					},
				},
			},
		});
	});
});

describe('getCustomProperty', () => {
	test('Exact string match', () => {
		const style = document.createElement('style');
		style.textContent = `
			[data-bge-container] {
				--bge-options-width--normal: 800px;
				--bge-options-width: var(--bge-options-width--normal);
			}
		`;
		document.head.append(style);
		expect(getCustomProperty(document, '--bge-options-width--normal')).toBe('800px');
	});

	test('RegExp match', () => {
		const style = document.createElement('style');
		style.textContent = `
			[data-bge-container] {
				--bge-options-width--normal: 800px;
				--bge-options-width: var(--bge-options-width--normal);
			}
		`;
		document.head.append(style);
		expect(getCustomProperty(document, /--bge-options-width--normal/)).toBe('800px');
	});

	test('No match returns null', () => {
		const style = document.createElement('style');
		style.textContent = `
			[data-bge-container] {
				--bge-options-width--normal: 800px;
			}
		`;
		document.head.append(style);
		expect(getCustomProperty(document, '--nonexistent')).toBeNull();
	});

	test('Non-prefixed custom property also matches', () => {
		const style = document.createElement('style');
		style.textContent = `
			[data-bge-container] {
				--custom-var: 42px;
			}
		`;
		document.head.append(style);
		expect(getCustomProperty(document, '--custom-var')).toBe('42px');
	});

	test('Higher priority layer value wins', () => {
		const style = document.createElement('style');
		style.textContent = `
			@layer a, b;
			@layer a { [data-bge-container] { --custom-var: low; } }
			@layer b { [data-bge-container] { --custom-var: high; } }
		`;
		document.head.append(style);
		expect(getCustomProperty(document, '--custom-var')).toBe('high');
	});

	test('Higher priority layer wins even when defined first', () => {
		const style = document.createElement('style');
		style.textContent = `
			@layer a, b;
			@layer b { [data-bge-container] { --custom-var: high; } }
			@layer a { [data-bge-container] { --custom-var: low; } }
		`;
		document.head.append(style);
		expect(getCustomProperty(document, '--custom-var')).toBe('high');
	});
});

describe('Null value handling', () => {
	test('null value is excluded from properties', () => {
		const style = document.createElement('style');
		style.textContent = `
			[data-bge-container] {
				--bge-options-shadow--none: none;
				--bge-options-shadow--premium: null;
				--bge-options-shadow: var(--bge-options-shadow--none);
			}
		`;
		document.head.append(style);
		const result = getCustomProperties(document);
		const resultObj = toObject(result);
		expect(resultObj.shadow.properties).not.toHaveProperty('premium');
		expect(resultObj.shadow.properties).toHaveProperty('none');
	});
});

describe('Empty category handling', () => {
	test('Category with only default value (no key properties) is not in result', () => {
		const style = document.createElement('style');
		style.textContent = `
			[data-bge-container] {
				--bge-options-empty: some-value;
			}
		`;
		document.head.append(style);
		const result = getCustomProperties(document);
		const resultObj = toObject(result);
		expect(resultObj).not.toHaveProperty('empty');
	});
});

// ============================================================================
// At-rule traversal behavior
// getStyleRules は CSSStyleRule, CSSLayerBlockRule, CSSScopeRule を再帰走査する。
// 他の at-rule (@media, @supports, @container) 内のルールは検出されない。
// ============================================================================

describe('At-rule traversal: non-traversed at-rules', () => {
	test('@media rules are not traversed', () => {
		const style = document.createElement('style');
		style.textContent = `
			[data-bge-container] {
				--bge-options-width--a: 100%;
				--bge-options-width: var(--bge-options-width--a);
			}
			@media all {
				[data-bge-container] {
					--bge-options-width--a: 200%;
				}
			}
		`;
		document.head.append(style);
		const result = getCustomProperties(document);
		const resultObj = toObject(result);
		// @media 内のルールは走査されないため、100% のみが検出される
		expect(resultObj.width.properties.a.value).toBe('100%');
	});

	test('@supports rules are not traversed', () => {
		const style = document.createElement('style');
		style.textContent = `
			[data-bge-container] {
				--bge-options-width--a: 100%;
				--bge-options-width: var(--bge-options-width--a);
			}
			@supports (display: grid) {
				[data-bge-container] {
					--bge-options-width--a: 200%;
				}
			}
		`;
		document.head.append(style);
		const result = getCustomProperties(document);
		const resultObj = toObject(result);
		expect(resultObj.width.properties.a.value).toBe('100%');
	});

	test('@container rules are not traversed', () => {
		const style = document.createElement('style');
		style.textContent = `
			[data-bge-container] {
				--bge-options-width--a: 100%;
				--bge-options-width: var(--bge-options-width--a);
			}
			@container (min-width: 0px) {
				[data-bge-container] {
					--bge-options-width--a: 200%;
				}
			}
		`;
		document.head.append(style);
		const result = getCustomProperties(document);
		const resultObj = toObject(result);
		expect(resultObj.width.properties.a.value).toBe('100%');
	});
});

describe('At-rule traversal: traversed rules', () => {
	test('@scope rules are traversed', () => {
		const style = document.createElement('style');
		style.textContent = `
			[data-bge-container] {
				--bge-options-width--a: 100%;
				--bge-options-width: var(--bge-options-width--a);
			}
			@scope (.wrapper) {
				[data-bge-container] {
					--bge-options-width--a: 200%;
				}
			}
		`;
		document.head.append(style);
		const result = getCustomProperties(document);
		const resultObj = toObject(result);
		// @scope 内のルールが走査され、後勝ちで 200% になる
		expect(resultObj.width.properties.a.value).toBe('200%');
	});

	test('CSS nesting (CSSStyleRule) is traversed', () => {
		const style = document.createElement('style');
		style.textContent = `
			.parent {
				[data-bge-container] {
					--bge-options-width--a: 100%;
					--bge-options-width: var(--bge-options-width--a);
				}
			}
		`;
		document.head.append(style);
		const result = getCustomProperties(document);
		const resultObj = toObject(result);
		expect(resultObj.width.properties.a.value).toBe('100%');
	});

	test('Deep CSS nesting (3 levels) is traversed', () => {
		const style = document.createElement('style');
		style.textContent = `
			.grandparent {
				.parent {
					[data-bge-container] {
						--bge-options-width--a: 100%;
						--bge-options-width: var(--bge-options-width--a);
					}
				}
			}
		`;
		document.head.append(style);
		const result = getCustomProperties(document);
		const resultObj = toObject(result);
		expect(resultObj.width.properties.a.value).toBe('100%');
	});
});

describe('At-rule traversal: mixed nesting', () => {
	test('@media inside @layer is not traversed', () => {
		const style = document.createElement('style');
		style.textContent = `
			@layer a {
				[data-bge-container] {
					--bge-options-width--a: 100%;
					--bge-options-width: var(--bge-options-width--a);
				}
				@media all {
					[data-bge-container] {
						--bge-options-width--a: 200%;
					}
				}
			}
		`;
		document.head.append(style);
		const result = getCustomProperties(document);
		const resultObj = toObject(result);
		// @layer a は走査されるが、その中の @media は走査されない
		expect(resultObj.width.properties.a.value).toBe('100%');
	});

	test('@layer inside @media is not traversed', () => {
		const style = document.createElement('style');
		style.textContent = `
			[data-bge-container] {
				--bge-options-width--a: 100%;
				--bge-options-width: var(--bge-options-width--a);
			}
			@media all {
				@layer a {
					[data-bge-container] {
						--bge-options-width--a: 200%;
					}
				}
			}
		`;
		document.head.append(style);
		const result = getCustomProperties(document);
		const resultObj = toObject(result);
		// @media が走査されないため、中の @layer も到達しない
		expect(resultObj.width.properties.a.value).toBe('100%');
	});

	test('@supports inside @layer is not traversed', () => {
		const style = document.createElement('style');
		style.textContent = `
			@layer a {
				[data-bge-container] {
					--bge-options-width--a: 100%;
					--bge-options-width: var(--bge-options-width--a);
				}
				@supports (display: grid) {
					[data-bge-container] {
						--bge-options-width--a: 200%;
					}
				}
			}
		`;
		document.head.append(style);
		const result = getCustomProperties(document);
		const resultObj = toObject(result);
		expect(resultObj.width.properties.a.value).toBe('100%');
	});

	test('CSS nesting inside @layer is traversed', () => {
		const style = document.createElement('style');
		style.textContent = `
			@layer a {
				.parent {
					[data-bge-container] {
						--bge-options-width--a: 100%;
						--bge-options-width: var(--bge-options-width--a);
					}
				}
			}
		`;
		document.head.append(style);
		const result = getCustomProperties(document);
		const resultObj = toObject(result);
		// @layer 内の CSS nesting は両方とも走査される
		expect(resultObj.width.properties.a.value).toBe('100%');
		expect(resultObj.width.properties.a.priority).toEqual([1]);
	});

	test('@scope inside @layer is traversed', () => {
		const style = document.createElement('style');
		style.textContent = `
			@layer a {
				[data-bge-container] {
					--bge-options-width--a: 100%;
					--bge-options-width: var(--bge-options-width--a);
				}
				@scope (.wrapper) {
					[data-bge-container] {
						--bge-options-width--a: 200%;
					}
				}
			}
		`;
		document.head.append(style);
		const result = getCustomProperties(document);
		const resultObj = toObject(result);
		// @layer a は走査され、その中の @scope も走査される（後勝ちで 200%）
		expect(resultObj.width.properties.a.value).toBe('200%');
	});
});

describe('@scope traversal', () => {
	test('@scope with scope root', () => {
		const style = document.createElement('style');
		style.textContent = `
			@scope (.component) {
				[data-bge-container] {
					--bge-options-width--a: 100%;
					--bge-options-width: var(--bge-options-width--a);
				}
			}
		`;
		document.head.append(style);
		const result = getCustomProperties(document);
		const resultObj = toObject(result);
		expect(resultObj.width.properties.a.value).toBe('100%');
		// @scope はカスケード優先度に影響しない
		expect(resultObj.width.properties.a.priority).toEqual([]);
	});

	test('@scope with scope root and limit', () => {
		const style = document.createElement('style');
		style.textContent = `
			@scope (.component) to (.child) {
				[data-bge-container] {
					--bge-options-width--a: 100%;
					--bge-options-width: var(--bge-options-width--a);
				}
			}
		`;
		document.head.append(style);
		const result = getCustomProperties(document);
		const resultObj = toObject(result);
		expect(resultObj.width.properties.a.value).toBe('100%');
		expect(resultObj.width.properties.a.priority).toEqual([]);
	});

	test('@layer inside @scope is traversed with layer priority', () => {
		const style = document.createElement('style');
		style.textContent = `
			@scope (.component) {
				@layer a {
					[data-bge-container] {
						--bge-options-width--a: 100%;
						--bge-options-width: var(--bge-options-width--a);
					}
				}
			}
		`;
		document.head.append(style);
		const result = getCustomProperties(document);
		const resultObj = toObject(result);
		expect(resultObj.width.properties.a.value).toBe('100%');
		// @scope 内の @layer も正しくレイヤー優先度が付与される
		expect(resultObj.width.properties.a.priority).toEqual([1]);
	});

	test('@scope + unlayered overrides @scope + layered', () => {
		const style = document.createElement('style');
		style.textContent = `
			@scope (.component) {
				@layer a {
					[data-bge-container] {
						--bge-options-width--a: 100%;
						--bge-options-width: var(--bge-options-width--a);
					}
				}
			}
			@scope (.component) {
				[data-bge-container] {
					--bge-options-width--a: 200%;
					--bge-options-width: var(--bge-options-width--a);
				}
			}
		`;
		document.head.append(style);
		const result = getCustomProperties(document);
		const resultObj = toObject(result);
		// unlayered [] は layered [1] より高優先度 → 200% が勝つ
		expect(resultObj.width.properties.a.value).toBe('200%');
	});

	test('@media inside @scope is not traversed', () => {
		const style = document.createElement('style');
		style.textContent = `
			[data-bge-container] {
				--bge-options-width--a: 100%;
				--bge-options-width: var(--bge-options-width--a);
			}
			@scope (.component) {
				@media all {
					[data-bge-container] {
						--bge-options-width--a: 200%;
					}
				}
			}
		`;
		document.head.append(style);
		const result = getCustomProperties(document);
		const resultObj = toObject(result);
		// @scope は走査されるが、その中の @media は走査されない
		expect(resultObj.width.properties.a.value).toBe('100%');
	});

	test('@scope ([data-bge-container]) { :scope { ... } } is detected', () => {
		const style = document.createElement('style');
		style.textContent = `
			@scope ([data-bge-container]) {
				:scope {
					--bge-options-width--a: 100%;
					--bge-options-width: var(--bge-options-width--a);
				}
			}
		`;
		document.head.append(style);
		const result = getCustomProperties(document);
		const resultObj = toObject(result);
		expect(resultObj.width.properties.a.value).toBe('100%');
		expect(resultObj.width.properties.a.priority).toEqual([]);
	});

	test(':scope inside @scope overrides earlier rule', () => {
		const style = document.createElement('style');
		style.textContent = `
			[data-bge-container] {
				--bge-options-width--a: 100%;
				--bge-options-width: var(--bge-options-width--a);
			}
			@scope ([data-bge-container]) {
				:scope {
					--bge-options-width--a: 200%;
				}
			}
		`;
		document.head.append(style);
		const result = getCustomProperties(document);
		const resultObj = toObject(result);
		// @scope 内の :scope が後勝ちで 200%
		expect(resultObj.width.properties.a.value).toBe('200%');
	});

	test(':scope inside @scope with non-matching root is not detected', () => {
		const style = document.createElement('style');
		style.textContent = `
			@scope (.other-selector) {
				:scope {
					--bge-options-width--a: 100%;
					--bge-options-width: var(--bge-options-width--a);
				}
			}
		`;
		document.head.append(style);
		const result = getCustomProperties(document);
		const resultObj = toObject(result);
		// scopeRoot が [data-bge-container] ではないので検出されない
		expect(resultObj).not.toHaveProperty('width');
	});

	test(':scope inside @layer inside @scope ([data-bge-container])', () => {
		const style = document.createElement('style');
		style.textContent = `
			@scope ([data-bge-container]) {
				@layer a {
					:scope {
						--bge-options-width--a: 100%;
						--bge-options-width: var(--bge-options-width--a);
					}
				}
			}
		`;
		document.head.append(style);
		const result = getCustomProperties(document);
		const resultObj = toObject(result);
		expect(resultObj.width.properties.a.value).toBe('100%');
		expect(resultObj.width.properties.a.priority).toEqual([1]);
	});
});

describe('Multiple stylesheets', () => {
	test('Later stylesheet overrides earlier (no layers)', () => {
		const style1 = document.createElement('style');
		style1.textContent = `
			[data-bge-container] {
				--bge-options-width--a: 100%;
				--bge-options-width: var(--bge-options-width--a);
			}
		`;
		const style2 = document.createElement('style');
		style2.textContent = `
			[data-bge-container] {
				--bge-options-width--a: 200%;
				--bge-options-width: var(--bge-options-width--a);
			}
		`;
		document.head.append(style1, style2);
		const result = getCustomProperties(document);
		const resultObj = toObject(result);
		// 両方 unlayered (priority []) → 後から出現した 200% が勝つ
		expect(resultObj.width.properties.a.value).toBe('200%');
	});

	test('Layered in first stylesheet, unlayered in second overrides', () => {
		const style1 = document.createElement('style');
		style1.textContent = `
			@layer a {
				[data-bge-container] {
					--bge-options-width--a: 100%;
					--bge-options-width: var(--bge-options-width--a);
				}
			}
		`;
		const style2 = document.createElement('style');
		style2.textContent = `
			[data-bge-container] {
				--bge-options-width--a: 200%;
				--bge-options-width: var(--bge-options-width--a);
			}
		`;
		document.head.append(style1, style2);
		const result = getCustomProperties(document);
		const resultObj = toObject(result);
		// unlayered [] は layered [1] より高優先度 → 200% が勝つ
		expect(resultObj.width.properties.a.value).toBe('200%');
	});

	test('Layer order is resolved globally across stylesheets', () => {
		const style1 = document.createElement('style');
		style1.textContent = `
			@layer a, b;
		`;
		const style2 = document.createElement('style');
		style2.textContent = `
			@layer a {
				[data-bge-container] {
					--bge-options-width--a: 100%;
					--bge-options-width: var(--bge-options-width--a);
				}
			}
			@layer b {
				[data-bge-container] {
					--bge-options-width--a: 200%;
					--bge-options-width: var(--bge-options-width--a);
				}
			}
		`;
		document.head.append(style1, style2);
		const result = getCustomProperties(document);
		const resultObj = toObject(result);
		// グローバルレイヤー順序: style1 の @layer a, b; → [a, b]
		// style2 の block rule a, b はすでに登録済み
		// b が高優先度 → 200% が勝つ
		expect(resultObj.width.properties.a.value).toBe('200%');
	});

	test('Cross-stylesheet reversed @layer statement: earlier layer wins', () => {
		const style1 = document.createElement('style');
		style1.textContent = `
			@layer b, a;
		`;
		const style2 = document.createElement('style');
		style2.textContent = `
			@layer a {
				[data-bge-container] {
					--bge-options-width--x: from-a;
				}
			}
		`;
		const style3 = document.createElement('style');
		style3.textContent = `
			@layer b {
				[data-bge-container] {
					--bge-options-width--x: from-b;
				}
			}
		`;
		document.head.append(style1, style2, style3);
		const result = getCustomProperties(document);
		const resultObj = toObject(result);
		// グローバルレイヤー順序: @layer b, a; → [b, a]
		// a が後 = 高優先度 → from-a が勝つ
		expect(resultObj.width.properties.x.value).toBe('from-a');
	});

	test('BurgerEditor 3-sheet structure: declaration + base + project null', () => {
		// Sheet 0: グローバルレイヤー順序宣言
		const sheet0 = document.createElement('style');
		sheet0.textContent = `
			@layer bge-component-bases, bge-components, bge-ui;
		`;
		// Sheet 1: ベース値定義
		const sheet1 = document.createElement('style');
		sheet1.textContent = `
			@layer bge-component-bases {
				[data-bge-container] {
					--bge-options-max-width--normal: 50rem;
					--bge-options-max-width--small: 25rem;
					--bge-options-max-width--large: 75rem;
					--bge-options-max-width--full: 100dvi;
					--bge-options-max-width: var(--bge-options-max-width--normal);
				}
			}
		`;
		// Sheet 2: プロジェクトCSS（上位レイヤーで null 上書き）
		const sheet2 = document.createElement('style');
		sheet2.textContent = `
			@layer bge-components {
				@layer main {
					.c-content-main {
						& [data-bge-container] {
							--bge-options-max-width--normal: null;
						}
					}
				}
			}
		`;
		document.head.append(sheet0, sheet1, sheet2);
		const result = getCustomProperties(document);
		const resultObj = toObject(result);
		// bge-components > bge-component-bases なので null が正しく効く
		expect(resultObj['max-width'].properties).not.toHaveProperty('normal');
		expect(resultObj['max-width'].properties).toHaveProperty('small');
		expect(resultObj['max-width'].properties).toHaveProperty('large');
		expect(resultObj['max-width'].properties).toHaveProperty('full');
	});
});

describe('Deeply nested layers', () => {
	test('Three levels of layer nesting', () => {
		const style = document.createElement('style');
		style.textContent = `
			@layer a {
				@layer b {
					@layer c {
						[data-bge-container] {
							--bge-options-width--a: 100%;
							--bge-options-width: var(--bge-options-width--a);
						}
					}
				}
			}
		`;
		document.head.append(style);
		const result = getCustomProperties(document);
		const resultObj = toObject(result);
		expect(resultObj.width.properties.a.value).toBe('100%');
		expect(resultObj.width.properties.a.priority).toEqual([1, 1, 1]);
	});

	test('Three levels with statements at each level', () => {
		const style = document.createElement('style');
		style.textContent = `
			@layer x, y;
			@layer x {
				@layer p, q;
				@layer p {
					[data-bge-container] {
						--bge-options-width--a: 100%;
						--bge-options-width: var(--bge-options-width--a);
					}
				}
				@layer q {
					[data-bge-container] {
						--bge-options-width--a: 200%;
						--bge-options-width: var(--bge-options-width--a);
					}
				}
			}
			@layer y {
				@layer p, q;
				@layer p {
					[data-bge-container] {
						--bge-options-width--a: 300%;
						--bge-options-width: var(--bge-options-width--a);
					}
				}
				@layer q {
					[data-bge-container] {
						--bge-options-width--a: 400%;
						--bge-options-width: var(--bge-options-width--a);
					}
				}
			}
		`;
		document.head.append(style);
		const result = getCustomProperties(document);
		const resultObj = toObject(result);
		// @layer x, y; → y が高優先度
		// y 内で @layer p, q; → q が高優先度
		// → y.q (400%) が最高優先度
		expect(resultObj.width.properties.a.value).toBe('400%');
	});
});

// ============================================================================
// Null value handling in @layer / @scope / CSS nesting
// Production CSS の2層構造（general.css + ユーザーCSS）をシミュレート
// ============================================================================

/**
 * ベースCSS（general.css相当）
 */
const BASE_CSS = `
@layer bge-component-bases, bge-components;

@layer bge-component-bases {
	[data-bge-container] {
		--bge-options-max-width--normal: calc(800 / 16 * 1rem);
		--bge-options-max-width--small: calc(400 / 16 * 1rem);
		--bge-options-max-width--large: calc(1200 / 16 * 1rem);
		--bge-options-max-width--full: 100dvi;
		--bge-options-max-width: var(--bge-options-max-width--normal);

		--bge-options-margin--normal: 3rem;
		--bge-options-margin--none: 0;
		--bge-options-margin--small: 1rem;
		--bge-options-margin--large: 8rem;
		--bge-options-margin: var(--bge-options-margin--normal);

		--bge-options-bg-color--transparent: transparent;
		--bge-options-bg-color--white: #fff;
		--bge-options-bg-color--gray: #dfdfdf;
		--bge-options-bg-color: var(--bge-options-bg-color--transparent);
	}
}
`;

describe('Null value in @layer bge-components (Group 1)', () => {
	test('1-1: Partial null in @layer bge-components', () => {
		const style1 = document.createElement('style');
		style1.textContent = BASE_CSS;
		const style2 = document.createElement('style');
		style2.textContent = `
			@layer bge-components {
				[data-bge-container] {
					--bge-options-max-width--full: null;
					--bge-options-max-width--large: null;
				}
			}
		`;
		document.head.append(style1, style2);
		const result = getCustomProperties(document);
		const resultObj = toObject(result);

		// full, large は除外
		expect(resultObj['max-width'].properties).not.toHaveProperty('full');
		expect(resultObj['max-width'].properties).not.toHaveProperty('large');
		// normal(isDefault:true), small は残る
		expect(resultObj['max-width'].properties).toHaveProperty('normal');
		expect(resultObj['max-width'].properties.normal.isDefault).toBe(true);
		expect(resultObj['max-width'].properties).toHaveProperty('small');
		// margin, bg-color は影響なし
		expect(Object.keys(resultObj.margin.properties)).toHaveLength(4);
		expect(Object.keys(resultObj['bg-color'].properties)).toHaveLength(3);
	});

	test('1-2: All keys null in a category', () => {
		const style1 = document.createElement('style');
		style1.textContent = BASE_CSS;
		const style2 = document.createElement('style');
		style2.textContent = `
			@layer bge-components {
				[data-bge-container] {
					--bge-options-bg-color--transparent: null;
					--bge-options-bg-color--white: null;
					--bge-options-bg-color--gray: null;
				}
			}
		`;
		document.head.append(style1, style2);
		const result = getCustomProperties(document);
		const resultObj = toObject(result);

		// bg-color カテゴリの properties が空
		expect(Object.keys(resultObj['bg-color'].properties)).toHaveLength(0);
		// max-width, margin は影響なし
		expect(Object.keys(resultObj['max-width'].properties)).toHaveLength(4);
		expect(Object.keys(resultObj.margin.properties)).toHaveLength(4);
	});

	test('1-3: Null the default reference key', () => {
		const style1 = document.createElement('style');
		style1.textContent = BASE_CSS;
		const style2 = document.createElement('style');
		style2.textContent = `
			@layer bge-components {
				[data-bge-container] {
					--bge-options-margin--normal: null;
				}
			}
		`;
		document.head.append(style1, style2);
		const result = getCustomProperties(document);
		const resultObj = toObject(result);

		// normal は除外
		expect(resultObj.margin.properties).not.toHaveProperty('normal');
		// none, small, large は残る
		expect(resultObj.margin.properties).toHaveProperty('none');
		expect(resultObj.margin.properties).toHaveProperty('small');
		expect(resultObj.margin.properties).toHaveProperty('large');
		// normalが消えたので、残りのどのキーにもisDefault: trueがつかない
		for (const prop of Object.values(resultObj.margin.properties)) {
			expect((prop as { isDefault: boolean }).isDefault).toBe(false);
		}
	});
});

describe('Null value in @scope (Group 2)', () => {
	test('2-1: @layer bge-components > @scope null', () => {
		const style1 = document.createElement('style');
		style1.textContent = BASE_CSS;
		const style2 = document.createElement('style');
		style2.textContent = `
			@layer bge-components {
				@scope (.custom-section) {
					[data-bge-container] {
						--bge-options-max-width--full: null;
						--bge-options-max-width--large: null;
					}
				}
			}
		`;
		document.head.append(style1, style2);
		const result = getCustomProperties(document);
		const resultObj = toObject(result);

		expect(resultObj['max-width'].properties).not.toHaveProperty('full');
		expect(resultObj['max-width'].properties).not.toHaveProperty('large');
		expect(resultObj['max-width'].properties).toHaveProperty('normal');
		expect(resultObj['max-width'].properties.normal.isDefault).toBe(true);
		expect(resultObj['max-width'].properties).toHaveProperty('small');
	});

	test('2-2: Unlayered @scope null', () => {
		const style1 = document.createElement('style');
		style1.textContent = BASE_CSS;
		const style2 = document.createElement('style');
		style2.textContent = `
			@scope (.custom-section) {
				[data-bge-container] {
					--bge-options-max-width--full: null;
				}
			}
		`;
		document.head.append(style1, style2);
		const result = getCustomProperties(document);
		const resultObj = toObject(result);

		// unlayered [] > bge-component-bases → full 除外
		expect(resultObj['max-width'].properties).not.toHaveProperty('full');
		expect(resultObj['max-width'].properties).toHaveProperty('normal');
		expect(resultObj['max-width'].properties).toHaveProperty('small');
		expect(resultObj['max-width'].properties).toHaveProperty('large');
	});

	test('2-3: @scope([data-bge-container]) + :scope null', () => {
		const style1 = document.createElement('style');
		style1.textContent = BASE_CSS;
		const style2 = document.createElement('style');
		style2.textContent = `
			@layer bge-components {
				@scope ([data-bge-container]) {
					:scope {
						--bge-options-max-width--full: null;
						--bge-options-margin--large: null;
					}
				}
			}
		`;
		document.head.append(style1, style2);
		const result = getCustomProperties(document);
		const resultObj = toObject(result);

		// max-width--full と margin--large が除外
		expect(resultObj['max-width'].properties).not.toHaveProperty('full');
		expect(resultObj.margin.properties).not.toHaveProperty('large');
		// 他は残存
		expect(resultObj['max-width'].properties).toHaveProperty('normal');
		expect(resultObj['max-width'].properties).toHaveProperty('small');
		expect(resultObj['max-width'].properties).toHaveProperty('large');
		expect(resultObj.margin.properties).toHaveProperty('normal');
		expect(resultObj.margin.properties).toHaveProperty('none');
		expect(resultObj.margin.properties).toHaveProperty('small');
	});

	test('2-4: @scope null overridden by later real value', () => {
		const style1 = document.createElement('style');
		style1.textContent = BASE_CSS;
		const style2 = document.createElement('style');
		style2.textContent = `
			@scope (.section) {
				[data-bge-container] {
					--bge-options-max-width--full: null;
				}
			}
			[data-bge-container] {
				--bge-options-max-width--full: 100dvi;
			}
		`;
		document.head.append(style1, style2);
		const result = getCustomProperties(document);
		const resultObj = toObject(result);

		// 後から来た実値が後勝ちで null を上書き → full は残る
		expect(resultObj['max-width'].properties).toHaveProperty('full');
		expect(resultObj['max-width'].properties.full.value).toBe('100dvi');
	});

	test('2-5: Nested @scope null', () => {
		const style1 = document.createElement('style');
		style1.textContent = BASE_CSS;
		const style2 = document.createElement('style');
		style2.textContent = `
			@layer bge-components {
				@scope (.outer) {
					@scope (.inner) {
						[data-bge-container] {
							--bge-options-max-width--full: null;
						}
					}
				}
			}
		`;
		document.head.append(style1, style2);
		const result = getCustomProperties(document);
		const resultObj = toObject(result);

		expect(resultObj['max-width'].properties).not.toHaveProperty('full');
		expect(resultObj['max-width'].properties).toHaveProperty('normal');
		expect(resultObj['max-width'].properties).toHaveProperty('small');
		expect(resultObj['max-width'].properties).toHaveProperty('large');
	});
});

describe('Null value in CSS nesting (Group 3)', () => {
	test('3-1: @layer bge-components > CSS nesting null', () => {
		const style1 = document.createElement('style');
		style1.textContent = BASE_CSS;
		const style2 = document.createElement('style');
		style2.textContent = `
			@layer bge-components {
				.custom-theme {
					[data-bge-container] {
						--bge-options-bg-color--gray: null;
						--bge-options-bg-color--white: null;
					}
				}
			}
		`;
		document.head.append(style1, style2);
		const result = getCustomProperties(document);
		const resultObj = toObject(result);

		expect(resultObj['bg-color'].properties).not.toHaveProperty('gray');
		expect(resultObj['bg-color'].properties).not.toHaveProperty('white');
		expect(resultObj['bg-color'].properties).toHaveProperty('transparent');
		expect(resultObj['bg-color'].properties.transparent.isDefault).toBe(true);
	});

	test('3-2: Deep CSS nesting (3 levels) null', () => {
		const style1 = document.createElement('style');
		style1.textContent = BASE_CSS;
		const style2 = document.createElement('style');
		style2.textContent = `
			@layer bge-components {
				.theme {
					.section {
						[data-bge-container] {
							--bge-options-margin--large: null;
						}
					}
				}
			}
		`;
		document.head.append(style1, style2);
		const result = getCustomProperties(document);
		const resultObj = toObject(result);

		expect(resultObj.margin.properties).not.toHaveProperty('large');
		expect(resultObj.margin.properties).toHaveProperty('normal');
		expect(resultObj.margin.properties).toHaveProperty('none');
		expect(resultObj.margin.properties).toHaveProperty('small');
	});
});

describe('Null value composite patterns (Group 4)', () => {
	test('4-1: @layer + @scope + nesting triple structure', () => {
		const style1 = document.createElement('style');
		style1.textContent = BASE_CSS;
		const style2 = document.createElement('style');
		style2.textContent = `
			@layer bge-components {
				@scope (.landing-page) {
					.hero {
						[data-bge-container] {
							--bge-options-max-width--small: null;
							--bge-options-max-width--normal: null;
							--bge-options-margin--small: null;
						}
					}
				}
			}
		`;
		document.head.append(style1, style2);
		const result = getCustomProperties(document);
		const resultObj = toObject(result);

		// max-width: small, normal 除外。large, full 残存
		expect(resultObj['max-width'].properties).not.toHaveProperty('small');
		expect(resultObj['max-width'].properties).not.toHaveProperty('normal');
		expect(resultObj['max-width'].properties).toHaveProperty('large');
		expect(resultObj['max-width'].properties).toHaveProperty('full');
		// normalが消えたのでどれもisDefault: trueにならない
		for (const prop of Object.values(resultObj['max-width'].properties)) {
			expect((prop as { isDefault: boolean }).isDefault).toBe(false);
		}
		// margin: small 除外。normal(isDefault:true), none, large 残存
		expect(resultObj.margin.properties).not.toHaveProperty('small');
		expect(resultObj.margin.properties).toHaveProperty('normal');
		expect(resultObj.margin.properties.normal.isDefault).toBe(true);
		expect(resultObj.margin.properties).toHaveProperty('none');
		expect(resultObj.margin.properties).toHaveProperty('large');
	});

	test('4-2: @scope > @layer reverse nesting', () => {
		const style1 = document.createElement('style');
		style1.textContent = BASE_CSS;
		const style2 = document.createElement('style');
		style2.textContent = `
			@scope (.custom-section) {
				@layer bge-components {
					[data-bge-container] {
						--bge-options-max-width--full: null;
					}
				}
			}
		`;
		document.head.append(style1, style2);
		const result = getCustomProperties(document);
		const resultObj = toObject(result);

		expect(resultObj['max-width'].properties).not.toHaveProperty('full');
		expect(resultObj['max-width'].properties).toHaveProperty('normal');
	});

	test('4-3: Multiple user stylesheets with different null keys', () => {
		const style1 = document.createElement('style');
		style1.textContent = BASE_CSS;
		const style2 = document.createElement('style');
		style2.textContent = `
			@layer bge-components {
				@scope (.block-type-a) {
					[data-bge-container] {
						--bge-options-max-width--full: null;
					}
				}
			}
		`;
		const style3 = document.createElement('style');
		style3.textContent = `
			@layer bge-components {
				@scope (.block-type-b) {
					[data-bge-container] {
						--bge-options-max-width--small: null;
						--bge-options-margin--large: null;
					}
				}
			}
		`;
		document.head.append(style1, style2, style3);
		const result = getCustomProperties(document);
		const resultObj = toObject(result);

		// max-width: full, small 除外。normal(isDefault:true), large 残存
		expect(resultObj['max-width'].properties).not.toHaveProperty('full');
		expect(resultObj['max-width'].properties).not.toHaveProperty('small');
		expect(resultObj['max-width'].properties).toHaveProperty('normal');
		expect(resultObj['max-width'].properties.normal.isDefault).toBe(true);
		expect(resultObj['max-width'].properties).toHaveProperty('large');
		// margin: large 除外。normal(isDefault:true), none, small 残存
		expect(resultObj.margin.properties).not.toHaveProperty('large');
		expect(resultObj.margin.properties).toHaveProperty('normal');
		expect(resultObj.margin.properties.normal.isDefault).toBe(true);
		expect(resultObj.margin.properties).toHaveProperty('none');
		expect(resultObj.margin.properties).toHaveProperty('small');
	});

	test('4-4: Null in base layer overridden by real value in higher layer', () => {
		const style1 = document.createElement('style');
		style1.textContent = `
			@layer bge-component-bases, bge-components;

			@layer bge-component-bases {
				[data-bge-container] {
					--bge-options-shadow--none: none;
					--bge-options-shadow--fancy: null;
					--bge-options-shadow: var(--bge-options-shadow--none);
				}
			}
		`;
		const style2 = document.createElement('style');
		style2.textContent = `
			@layer bge-components {
				[data-bge-container] {
					--bge-options-shadow--fancy: 0 4px 8px black;
				}
			}
		`;
		document.head.append(style1, style2);
		const result = getCustomProperties(document);
		const resultObj = toObject(result);

		// bge-components の実値が bge-component-bases の null に勝つ
		expect(resultObj.shadow.properties).toHaveProperty('fancy');
		expect(resultObj.shadow.properties.fancy.value).toBe('0 4px 8px black');
		expect(resultObj.shadow.properties).toHaveProperty('none');
	});

	test('4-5: @layer > @scope > @layer > :scope deepest nesting', () => {
		const style1 = document.createElement('style');
		style1.textContent = BASE_CSS;
		const style2 = document.createElement('style');
		style2.textContent = `
			@layer bge-components {
				@scope ([data-bge-container]) {
					@layer inner {
						:scope {
							--bge-options-max-width--full: null;
						}
					}
				}
			}
		`;
		document.head.append(style1, style2);
		const result = getCustomProperties(document);
		const resultObj = toObject(result);

		expect(resultObj['max-width'].properties).not.toHaveProperty('full');
		expect(resultObj['max-width'].properties).toHaveProperty('normal');
	});
});

describe('Null value edge cases (Group 5)', () => {
	test('5-1: containerType (_grid_) + user null', () => {
		const style1 = document.createElement('style');
		style1.textContent = `
			@layer bge-component-bases, bge-components;

			@layer bge-component-bases {
				[data-bge-container] {
					--bge-options-_grid_subgrid-gap--normal: 1rem;
					--bge-options-_grid_subgrid-gap--none: 0;
					--bge-options-_grid_subgrid-gap--large: 1rem;
					--bge-options-_grid_subgrid-gap: var(--bge-options-_grid_subgrid-gap--normal);
				}
			}
		`;
		const style2 = document.createElement('style');
		style2.textContent = `
			@layer bge-components {
				[data-bge-container] {
					--bge-options-_grid_subgrid-gap--large: null;
				}
			}
		`;
		document.head.append(style1, style2);
		const result = getCustomProperties(document, 'grid');
		const resultObj = toObject(result);

		expect(resultObj['_grid_subgrid-gap'].properties).not.toHaveProperty('large');
		expect(resultObj['_grid_subgrid-gap'].properties).toHaveProperty('normal');
		expect(resultObj['_grid_subgrid-gap'].properties.normal.isDefault).toBe(true);
		expect(resultObj['_grid_subgrid-gap'].properties).toHaveProperty('none');
	});

	test('5-2: NULL/Null case insensitive in @scope', () => {
		const style1 = document.createElement('style');
		style1.textContent = BASE_CSS;
		const style2 = document.createElement('style');
		style2.textContent = `
			@layer bge-components {
				@scope (.block) {
					[data-bge-container] {
						--bge-options-max-width--full: NULL;
						--bge-options-max-width--large:  Null ;
					}
				}
			}
		`;
		document.head.append(style1, style2);
		const result = getCustomProperties(document);
		const resultObj = toObject(result);

		expect(resultObj['max-width'].properties).not.toHaveProperty('full');
		expect(resultObj['max-width'].properties).not.toHaveProperty('large');
		expect(resultObj['max-width'].properties).toHaveProperty('normal');
		expect(resultObj['max-width'].properties).toHaveProperty('small');
	});

	test('5-3: Real value in second stylesheet overrides null in first', () => {
		const style1 = document.createElement('style');
		style1.textContent = `
			[data-bge-container] {
				--bge-options-shadow--none: none;
				--bge-options-shadow--fancy: null;
				--bge-options-shadow: var(--bge-options-shadow--none);
			}
		`;
		const style2 = document.createElement('style');
		style2.textContent = `
			[data-bge-container] {
				--bge-options-shadow--fancy: 0 4px 8px black;
			}
		`;
		document.head.append(style1, style2);
		const result = getCustomProperties(document);
		const resultObj = toObject(result);

		// 後勝ち → fancy 残る
		expect(resultObj.shadow.properties).toHaveProperty('fancy');
		expect(resultObj.shadow.properties.fancy.value).toBe('0 4px 8px black');
	});

	test('5-4: Null in second stylesheet overrides real value in first', () => {
		const style1 = document.createElement('style');
		style1.textContent = `
			[data-bge-container] {
				--bge-options-shadow--none: none;
				--bge-options-shadow--fancy: 0 4px 8px black;
				--bge-options-shadow: var(--bge-options-shadow--none);
			}
		`;
		const style2 = document.createElement('style');
		style2.textContent = `
			[data-bge-container] {
				--bge-options-shadow--fancy: null;
			}
		`;
		document.head.append(style1, style2);
		const result = getCustomProperties(document);
		const resultObj = toObject(result);

		// 後勝ち → fancy 除外
		expect(resultObj.shadow.properties).not.toHaveProperty('fancy');
		expect(resultObj.shadow.properties).toHaveProperty('none');
	});
});

// ============================================================================
// Production 再現テスト: プロジェクトの実構造
// @layer main-base にベース定義、@layer main の CSS nesting 内で null
// ============================================================================

describe('Production reproduction: @layer main-base + @layer main nesting null', () => {
	test('Null in @layer main > .parent > [data-bge-container] overrides @layer main-base base', () => {
		const style = document.createElement('style');
		style.textContent = `
			@layer main-base, main;

			@layer main-base {
				[data-bge-container] {
					--bge-options-max-width--normal: 50rem;
					--bge-options-max-width--small: 25rem;
					--bge-options-max-width--large: 75rem;
					--bge-options-max-width--full: 100dvi;
					--bge-options-max-width: var(--bge-options-max-width--normal);
				}
			}

			@layer main {
				.c-content-main {
					[data-bge-container] {
						--bge-options-max-width--normal: null;
						--bge-options-max-width--small: null;
					}
				}
			}
		`;
		document.head.append(style);
		const result = getCustomProperties(document);
		const resultObj = toObject(result);

		// null が main-base のベース定義を上書き → normal, small は除外
		expect(resultObj['max-width'].properties).not.toHaveProperty('normal');
		expect(resultObj['max-width'].properties).not.toHaveProperty('small');
		// large, full は残る
		expect(resultObj['max-width'].properties).toHaveProperty('large');
		expect(resultObj['max-width'].properties).toHaveProperty('full');
	});
});
