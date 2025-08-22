import { test, expect, describe } from 'vitest';

import { getCustomProperties } from './get-custom-properties.js';

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

	const resultObj = Object.fromEntries(
		[...result.entries()].map(([key, map]) => [key, Object.fromEntries(map.entries())]),
	);

	expect(resultObj).toMatchObject({
		width: {
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
		margin: {
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
		bgcolor: {
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
		border: {
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
				}
			}
		`;
		document.head.append(style);

		const result = getCustomProperties(document);

		const resultObj = Object.fromEntries(
			[...result.entries()].map(([key, map]) => [key, Object.fromEntries(map.entries())]),
		);

		expect(resultObj).toMatchObject({
			width: {
				a: {
					isDefault: true,
					value: '200%',
				},
			},
		});
	});
});
