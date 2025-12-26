import { test, expect, describe, beforeEach } from 'vitest';

import { getCustomProperties } from './get-custom-properties.js';

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
				},
				small: {
					isDefault: false,
					value: 'calc(400 / 16 * 1rem)',
				},
				medium: {
					isDefault: false,
					value: 'calc(600 / 16 * 1rem)',
				},
				large: {
					isDefault: false,
					value: 'calc(1200 / 16 * 1rem)',
				},
				full: {
					isDefault: false,
					value: '100dvi',
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
						value: '200%',
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
					},
				},
			},
		});
	});

	test('Multiple Nested layers', () => {
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

	test('Multiple Nested layers', () => {
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

	test('Multiple Nested layers', () => {
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
