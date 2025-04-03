import type { Filter, FrozenPattyData, PrimitiveDatum } from './types.js';

import { fieldNameParser } from './field-name-parser.js';
import { kebabCase } from './utils.js';

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

	const rawValue = el.getAttribute(`data-${attr}`);
	const listRoot = el.closest(`[data-${attr}-list]`);
	const forceArray = !!listRoot;
	if (rawValue == null) {
		throw new Error(`data-${attr} attriblute is empty.`);
	}
	const fieldList = rawValue.split(/\s*,\s*/);

	for (const field of fieldList) {
		let value: PrimitiveDatum;

		const { fieldName, propName } = fieldNameParser(field);

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

					value = getAttribute(el, attr, propName, convertType);
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
 * @param attr
 * @param keyAttr
 * @param typeConvert
 */
function getAttribute(el: Element, attr: string, keyAttr: string, typeConvert: boolean) {
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
		case 'href': {
			// return (el as HTMLAnchorElement).href;
			return el.getAttribute(keyAttr) ?? ''; // return plain string
		}
		default: {
			let value: string;
			const dataAttr = ['data', attr, kebabCase(keyAttr)].join('-');

			if (el.hasAttribute(dataAttr)) {
				value = el.getAttribute(dataAttr) || '';
			} else {
				value = el.getAttribute(keyAttr) || '';
			}

			if (typeConvert) {
				value = convert(value);
			}

			return value;
		}
	}
}

/**
 *
 * @param value
 */
function convert(value: string) {
	value = parse(value);

	if (URL.canParse(value)) {
		const url = new URL(value, location.href);
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
function parse(value: string) {
	try {
		return JSON.parse(value);
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
