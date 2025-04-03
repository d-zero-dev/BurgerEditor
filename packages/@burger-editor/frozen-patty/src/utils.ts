import type { FrozenPattyData, PrimitiveDatum } from './types.js';

/**
 * List of dangerous HTML elements to block for XSS protection
 */
export const DANGEROUS_ELEMENTS = [
	'script',
	'style',
	'template',
	'object',
	'embed',
	'iframe',
	'frame',
	'frameset',
	'applet',
];

/**
 *
 * @param kvs
 */
export function arrayToHash(kvs: [keyof FrozenPattyData, PrimitiveDatum, boolean][]) {
	const result: { [index: string]: PrimitiveDatum | PrimitiveDatum[] } = {};
	for (const kv of kvs) {
		const k = kv[0];
		const v = kv[1];
		const toArray = kv[2];

		if (!toArray) {
			result[k] = v;
			continue;
		}

		const arrayPropVal = result[k];

		if (Array.isArray(arrayPropVal)) {
			arrayPropVal.push(v);
			continue;
		}

		result[k] = k in result ? [arrayPropVal, v] : [v];
	}
	return result;
}

/**
 *
 * @param str
 */
export function kebabCase(str: string) {
	return str.replaceAll(/([A-Z])/g, '-$1').toLowerCase();
}

/**
 *
 * @param str
 */
export function camelCase(str: string) {
	return str.replaceAll(/-([a-z])/g, (_, c) => c.toUpperCase());
}

/**
 * Removes dangerous script elements from HTML string
 * @param html HTML string
 * @returns Sanitized HTML
 */
export function sanitizeHtml(html: string): string {
	if (typeof html !== 'string') {
		return '';
	}

	// Parse HTML safely using DOM parser
	const doc = new DOMParser().parseFromString(html, 'text/html');
	const body = doc.body;

	// Remove all dangerous elements
	for (const tagName of DANGEROUS_ELEMENTS) {
		const elements = body.querySelectorAll(tagName);
		for (const element of elements) {
			element.remove();
		}
	}

	// Remove event handler attributes from all elements
	sanitizeElementAndChildren(body);

	return body.innerHTML;
}

/**
 * Sanitizes an element and all its child elements
 * @param element Target element
 */
function sanitizeElementAndChildren(element: Element): void {
	// Remove dangerous attributes from current element
	sanitizeAttributes(element);

	// Process child elements recursively
	const children = element.children;
	for (const child of children) {
		sanitizeElementAndChildren(child);
	}
}

/**
 * Sanitizes attribute value
 * @param name Attribute name
 * @param value Attribute value
 * @returns Safe attribute value, or null if dangerous
 */
export function sanitizeAttributeValue(name: string, value: string): string | null {
	name = name.toLowerCase();

	// Disallow event handler attributes
	if (name.startsWith('on')) {
		return null;
	}

	// Check for dangerous protocol in link attributes
	if (
		name === 'href' ||
		name === 'src' ||
		name === 'action' ||
		name === 'formaction' ||
		name === 'xlink:href'
	) {
		const trimmedValue = value.trim().toLowerCase();
		if (
			trimmedValue.startsWith('javascript:') ||
			trimmedValue.startsWith('data:') ||
			trimmedValue.startsWith('vbscript:')
		) {
			return null;
		}
	}

	// Other dangerous attributes
	if (['manifest'].includes(name)) {
		return null;
	}

	return value;
}

/**
 * Removes dangerous attributes from an element
 * @param element Target element
 */
function sanitizeAttributes(element: Element): void {
	// Collect list of dangerous attributes
	const dangerousAttrs = [...element.attributes]
		.filter((attr) => sanitizeAttributeValue(attr.name, attr.value) === null)
		.map((attr) => attr.name);

	// Remove dangerous attributes
	for (const attrName of dangerousAttrs) {
		element.removeAttribute(attrName);
	}
}
