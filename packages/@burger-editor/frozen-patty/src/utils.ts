import type {
	FieldDefinition,
	FrozenPattyData,
	FrozenPattyFlattenData,
	PrimitiveDatum,
} from './types.js';

import { parseFields } from './parse-fields.js';

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
 * @param el
 * @param nodeName
 * @param attr
 * @param xssSanitize
 */
export function replaceNode(
	el: Element,
	nodeName: string,
	attr: string,
	xssSanitize = true,
): Element {
	nodeName = nodeName.toLowerCase();

	const currentName = el.localName ?? el.nodeName.toLowerCase();
	if (currentName === nodeName) {
		return el;
	}

	// Check element name if XSS protection is enabled
	if (
		xssSanitize && // Disallow dangerous elements
		DANGEROUS_ELEMENTS.includes(nodeName)
	) {
		return el;
	}

	const node = (el.ownerDocument ?? document).createElement(nodeName);
	for (const child of el.childNodes) {
		node.append(child.cloneNode(true));
	}

	const fields = getFields(el, attr);
	const attrs = new Set(fields.map((field) => field.propName));

	for (const { name, value } of el.attributes) {
		if (attrs.has(name)) {
			continue;
		}

		// Check attribute value if XSS protection is enabled
		if (xssSanitize) {
			const sanitizedValue = sanitizeAttributeValue(name, value);
			if (sanitizedValue !== null) {
				node.setAttribute(name, sanitizedValue);
			}
			continue;
		}

		node.setAttribute(name, value);
	}

	el.replaceWith(node);

	return node;
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

	// Simple approach to handle script tags content
	// First remove script tags but keep their content
	let sanitized = html;

	// For each dangerous element, replace tag but keep content using regex
	// Example: <script>alert("XSS")</script> -> alert("XSS")
	for (const tagName of DANGEROUS_ELEMENTS) {
		const regex = new RegExp(`<${tagName}[^>]*>(.*?)<\\/${tagName}>`, 'gis');
		sanitized = sanitized.replace(regex, '$1');
	}

	// Parse HTML safely using DOM parser for remaining sanitization
	const doc = new DOMParser().parseFromString(sanitized, 'text/html');
	const body = doc.body;

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
export function sanitizeAttributeValue<T extends PrimitiveDatum>(
	name: string,
	value: T,
): T | null {
	if (typeof value !== 'string') {
		return value;
	}

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

/**
 *
 * @param data
 * @param definedFields
 */
export function maxLengthOf(data: FrozenPattyData, definedFields: string[]) {
	let maxLength = 0;
	for (const key in data) {
		if (definedFields.includes(key) && Array.isArray(data[key])) {
			maxLength = Math.max(maxLength, data[key].length);
		}
	}
	return maxLength;
}

/**
 *
 * @param el
 * @param attr
 */
export function definedFields(el: Element, attr: string) {
	const fieldDefinitions = getFields(el, attr);
	return fieldDefinitions.map((field) => field.fieldName);
}

/**
 *
 * @param el
 * @param attr
 */
export function getFields(el: Element, attr: string) {
	const fields = el.getAttribute(`data-${attr}`);
	if (!fields) {
		return [];
	}
	return parseFields(fields);
}

/**
 *
 * @param el
 * @param attr
 * @param dataKeyName
 */
export function hasField(el: Element, attr: string, dataKeyName: string) {
	const fieldDefinitions = getFields(el, attr);
	return fieldDefinitions.some((field) => field.fieldName === dataKeyName);
}

/**
 *
 * @param fields
 * @param oldPropName
 * @param newPropName
 */
export function replaceProp(
	fields: readonly FieldDefinition[],
	oldPropName: string,
	newPropName: string,
) {
	return fields.map((field) => {
		if (field.propName === oldPropName) {
			return {
				...field,
				propName: newPropName,
			};
		}
		return field;
	});
}

/**
 *
 * @param fields
 * @param propName
 */
export function removeProp(fields: readonly FieldDefinition[], propName: string) {
	return fields.filter((field) => field.propName !== propName);
}

/**
 * - 値が配列の場合は、index に対応する値を返す。
 * - 値が配列でない場合は、そのまま返す。
 * - ⚠️ 値が配列で、index に対応する値が undefined の場合は、配列の最初の値を返す。
 * @param data
 * @param index
 */
export function flattenData(
	data: FrozenPattyData,
	index: number,
): FrozenPattyFlattenData {
	const result: FrozenPattyFlattenData = {};
	for (const key in data) {
		result[key] = Array.isArray(data[key])
			? data[key][index] === undefined
				? data[key][0]
				: data[key][index]
			: data[key];
	}
	return result;
}

/**
 * 特定の要素で、`propName in element`で判定できない属性名
 */
const specificProp: Record<string, string[]> = {
	/*
	 * JSDOMの未実装対策
	 * @see https://github.com/jsdom/jsdom/blob/main/lib/jsdom/living/nodes/HTMLSourceElement.webidl
	 * Living Standardでは実装済み
	 * @see https://html.spec.whatwg.org/multipage/embedded-content.html#htmlsourceelement
	 */
	source: ['width', 'height'],
};

/**
 *
 * @param el
 * @param name
 */
export function propInElement(el: Element, name: string): boolean {
	const has = name in el;
	if (has) {
		return true;
	}

	return specificProp[el.localName]?.includes(name) ?? false;
}
