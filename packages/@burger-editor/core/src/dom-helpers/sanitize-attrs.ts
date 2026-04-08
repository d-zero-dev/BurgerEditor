import { BLOCK_OPTION_CSS_CUSTOM_PROPERTY_PREFIX } from '../const.js';

const removeAttrNameIgnoreList = new Set([
	'data-bge-container',
	'data-bge-name',
	'style',
	'class',
	'id',
]);

/**
 *
 * @param el
 */
export function sanitizeAttrs(el: HTMLElement) {
	sanitizeStyle(el);

	const attrList = [...el.attributes];
	for (const attr of attrList) {
		if (!removeAttrNameIgnoreList.has(attr.localName)) {
			el.removeAttribute(attr.name);
		}
	}
}

/**
 *
 * @param el
 */
function sanitizeStyle(el: HTMLElement) {
	const customProperties: [string, string][] = [];

	const style = el.style;

	// JSDOM's CSSStyleDeclaration does not have Symbol.iterator
	const properties =
		typeof el.style[Symbol.iterator] === 'function' ? style : Object.keys(style);
	for (const property of properties) {
		if (property.startsWith(BLOCK_OPTION_CSS_CUSTOM_PROPERTY_PREFIX)) {
			customProperties.push([property, style.getPropertyValue(property)]);
		}
	}

	el.removeAttribute('style');

	for (const [property, value] of customProperties) {
		style.setProperty(property, value);
	}
}
