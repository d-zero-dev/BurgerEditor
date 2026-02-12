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

	test('Layer order is resolved per-stylesheet independently', () => {
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
		// style1 の @layer statement は style2 には影響しない（スタイルシートごとに独立）
		// style2 は block rule のみ → allLayerNames = [a, b] → reversed [b, a]
		// a: indexOf=1, priority=2 / b: indexOf=0, priority=1
		// b が高優先度 → 200% が勝つ
		expect(resultObj.width.properties.a.value).toBe('200%');
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
