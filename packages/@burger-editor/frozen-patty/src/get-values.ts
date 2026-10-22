import type { Filter, FrozenPattyData, PrimitiveDatum } from './types.js';

import { kebabCase } from '@burger-editor/utils';

import { normalizeIndent } from './normalize-indent.js';
import { parseFields } from './parse-fields.js';

/**
 * 属性が無いときに `null` として読む `<source>` の属性。要素のプロパティが
 * 属性の有無を隠す（空文字や `0` になる）ものだけを挙げる
 */
const SOURCE_ATTRIBUTES: ReadonlySet<string> = new Set([
	'srcset',
	'media',
	'sizes',
	'width',
	'height',
]);

/**
 * Get value from an element
 *
 * For a `<source>` element, an attribute that is not set (`srcset`, `media`,
 * `sizes`, `width`, `height`) is read as `null` instead of the empty string
 * or `0` that the element property would report. An attribute that is set
 * to an empty string stays an empty string, so "not set" and "empty" remain
 * distinguishable and a round trip does not leave `srcset=""` / `width="0"`.
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
					value = normalizeIndent(el.innerHTML);
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
						// カスタムプロパティは JSON として読める値だけを変換する（`--per-view: 3` を
						// 数値の 3 に）。属性の変換と違い、同じオリジンの URL を pathname に縮めない
						// （値を書き換えて情報を落とすため）。通常のプロパティ（`color` など）の値は
						// CSS の値なので変換しない
						if (css.startsWith('--') && convertType) {
							value = parse(value.trim());
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
				value = normalizeIndent(el.innerHTML);
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
	// `<source>` の属性が無いとき、プロパティは空文字（`srcset` / `media`）や
	// `0`（`width` / `height`）を返す。そのまま読むと「値が空」と「属性が無い」を
	// 区別できず、書き戻すと `srcset=""` `width="0"` が属性として残ってしまう。
	// 無いことを `null` で伝えれば、書き戻しで属性ごと取り除かれる
	if (
		el.localName === 'source' &&
		SOURCE_ATTRIBUTES.has(keyAttr) &&
		!el.hasAttribute(keyAttr)
	) {
		return null;
	}

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
					HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement
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
		const value = el.getAttribute(dataAttr);
		return typeConvert ? convert(value) : value;
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
