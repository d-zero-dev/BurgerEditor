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
	for (const property of style) {
		if (property.startsWith('--bge-options-')) {
			customProperties.push([property, style.getPropertyValue(property)]);
		}
	}

	el.removeAttribute('style');

	for (const [property, value] of customProperties) {
		style.setProperty(property, value);
	}
}
