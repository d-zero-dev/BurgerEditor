import type { Filter, FrozenPattyData, PrimitiveDatum } from './types.js';

import { kebabCase } from '@burger-editor/utils';

import { parseFields } from './parse-fields.js';

/**
 * Get value from an element
 * @param el A target element
 * @param convertType Auto covert type of value
 * @param attr Data attribute name for specifying the node that FrozenPatty treats as a field
 * @param filter
 */
export function getValues(
	el: Element,
	convertType = false,
	attr = 'field',
	filter?: Filter,
) {
	const result: [
		key: keyof FrozenPattyData,
		value: PrimitiveDatum,
		forceArray: boolean,
	][] = [];

	const query = el.getAttribute(`data-${attr}`);
	if (query == null) {
		throw new Error(`data-${attr} attriblute is empty.`);
	}

	const listRoot = el.closest(`[data-${attr}-list]`);
	const forceArray = !!listRoot;

	const fields = parseFields(query);
	for (const field of fields) {
		let value: PrimitiveDatum;

		const { fieldName, propName } = field;

		if (propName) {
			switch (propName) {
				case 'node': {
					value = el.localName ?? el.nodeName.toLowerCase();
					break;
				}
				case 'text': {
					value = el.textContent?.trim() ?? '';
					break;
				}
				case 'html': {
					value = el.innerHTML.trim();
					break;
				}
				case 'style': {
					if (el instanceof HTMLElement) {
						value = el.style.cssText;
					}
					break;
				}
				default: {
					if (/^style\([a-z-]+\)$/i.test(propName)) {
						const css = propName.replace(/^style\(([a-z-]+)\)$/i, '$1');
						let style: CSSStyleDeclaration;
						if (el instanceof HTMLElement) {
							style = el.style;
						} else {
							style = window.getComputedStyle(el);
						}
						value = style.getPropertyValue(css);
						if (css === 'background-image') {
							value = getBackgroundImagePath(value);
						}
						break;
					}

					value = getAttribute(el, propName, attr, convertType);
				}
			}
		} else {
			if (
				el instanceof HTMLInputElement ||
				el instanceof HTMLSelectElement ||
				el instanceof HTMLTextAreaElement
			) {
				const val = el.value;
				value = convertType ? convert(val) : val;
			} else {
				value = el.innerHTML.trim();
			}
		}

		if (filter) {
			value = filter(value);
		}

		if (value === undefined) {
			continue;
		}

		result.push([fieldName, value, forceArray]);
	}
	return result;
}

/**
 *
 * @param el
 * @param keyAttr
 * @param attr
 * @param typeConvert
 */
function getAttribute(el: Element, keyAttr: string, attr: string, typeConvert: boolean) {
	switch (keyAttr) {
		case 'contenteditable': {
			if (el instanceof HTMLElement) {
				return el.contentEditable === '' || el.contentEditable === 'true';
			} else {
				return el.getAttribute(keyAttr) === '' || el.getAttribute(keyAttr) === 'true';
			}
		}
		case 'checked': {
			return (el as HTMLInputElement).checked;
		}
		case 'disabled': {
			return (
				el as
					| HTMLInputElement
					| HTMLSelectElement
					| HTMLTextAreaElement
					| HTMLButtonElement
			).disabled;
		}
		case 'download': {
			// An inactive download attribute always returns an empty string.
			// So to get inactive it is necessary to use the "hasAttribute" method.
			return el.hasAttribute('download') ? el.getAttribute('download') : null;
		}
		case 'href':
		case 'src': {
			// Example: (el as HTMLAnchorElement).href;
			// Expected: return defined value of plain string
			return el.getAttribute(keyAttr) ?? '';
		}
	}

	let value: PrimitiveDatum =
		// @ts-ignore
		el[keyAttr];

	if (value !== undefined) {
		if (typeConvert) {
			value = convert(value);
		}
		return value;
	}

	// For shorthand notation, get value from data-field-* attribute
	const dataAttr = ['data', attr, kebabCase(keyAttr)].join('-');
	if (el.hasAttribute(dataAttr)) {
		return el.getAttribute(dataAttr) ?? '';
	}

	value = el.getAttribute(keyAttr) ?? null;

	if (
		(value === '' || value == null) &&
		typeof keyAttr === 'string' &&
		keyAttr.startsWith('data-')
	) {
		return '';
	}

	if (typeConvert) {
		value = convert(value);
	}

	return value;
}

/**
 *
 * @param value
 */
function convert(value: PrimitiveDatum): PrimitiveDatum {
	value = parse(value);
	const str = `${value}`;

	if (URL.canParse(str)) {
		const url = new URL(str, location.href);
		if (url.origin === location.origin) {
			return url.pathname;
		}
	}

	return value;
}

/**
 *
 * @param value
 */
function parse(value: PrimitiveDatum): PrimitiveDatum {
	try {
		return JSON.parse(`${value}`);
	} catch {
		return value;
	}
}

/**
 * Get path from value of "background-image"
 * @param value
 */
function getBackgroundImagePath(value: string) {
	const origin = `${location.protocol}//${location.hostname}${
		location.port ? `:${location.port}` : ''
	}`;
	return decodeURI(
		value.replace(/^url\(["']?([^"']+)["']?\)$/i, '$1').replace(origin, ''),
	);
}
