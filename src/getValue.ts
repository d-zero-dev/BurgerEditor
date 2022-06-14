import type { Filter, FrozenPattyData, PrimitiveDatum } from './frozen-patty';

/**
 * Get value from an element
 *
 * @param el HTMLElement
 * @param attr Data attribute name for specifying the node that FrozenPatty treats as a field
 * @param typeConvert Auto covert type of value
 */
export default function (
	el: Element,
	attr: string,
	typeConvert: boolean,
	filter?: Filter,
) {
	/**
	 * [key, value, forceArray]
	 */
	const result: [keyof FrozenPattyData, PrimitiveDatum, boolean][] = [];
	const rawValue = el.getAttribute(`data-${attr}`);
	const listRoot = el.closest(`[data-${attr}-list]`);
	const forceArray = !!listRoot;
	if (rawValue == null) {
		throw new Error(`data-${attr} attriblute is empty.`);
	}
	const fieldList = `${rawValue}`.split(/\s*,\s*/);
	// console.log({fieldList, el: el.innerHTML});
	for (let fieldName of fieldList) {
		let splitKey: string[];
		let keyAttr = '';
		let value: PrimitiveDatum;
		fieldName = fieldName.trim();
		if (
			/^[a-z_-](?:[a-z0-9_-])*:[a-z_-](?:[a-z0-9_-])*(?:\([a-z-]+\))?/i.test(
				fieldName,
			)
		) {
			splitKey = fieldName.split(':');
			fieldName = splitKey[0].trim();
			keyAttr = splitKey[1].trim();
		}
		// console.log({fieldName, keyAttr, el: el.innerHTML});
		if (keyAttr === 'text') {
			value = el.innerHTML;
		} else if (/^style\([a-z-]+\)$/i.test(keyAttr)) {
			const css = keyAttr.replace(/^style\(([a-z-]+)\)$/i, '$1');
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
		} else if (keyAttr) {
			value = getAttribute(el, keyAttr, typeConvert);
		} else {
			if (
				el instanceof HTMLInputElement ||
				el instanceof HTMLSelectElement ||
				el instanceof HTMLTextAreaElement
			) {
				const val = el.value;
				if (Array.isArray(val)) {
					value = cast(val[0]);
				} else {
					value = cast(val);
				}
			} else {
				value = el.innerHTML;
			}
		}
		// console.log({fieldName, value});
		if (filter) {
			value = filter(value);
		}
		result.push([fieldName, value, forceArray]);
	}
	// console.log({result});
	return result;
}

function getAttribute(el: Element, keyAttr: string, typeConvert: boolean) {
	switch (keyAttr) {
		case 'contenteditable': {
			if (el instanceof HTMLElement) {
				return el.contentEditable === '' || el.contentEditable === 'true';
			} else {
				return (
					el.getAttribute(keyAttr) === '' || el.getAttribute(keyAttr) === 'true'
				);
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
			return el.getAttribute(keyAttr) || ''; // return plain string
		}
		default: {
			if (/^data-/.test(keyAttr)) {
				const value = el.getAttribute(keyAttr) || '';
				if (typeConvert) {
					return cast(value);
				}
				return value;
			}
			return el.getAttribute(keyAttr) || '';
		}
	}
}

function cast(value: string) {
	if (value == null || value === '') {
		return '';
	}
	switch (value) {
		case 'true':
			return true;
		case 'false':
			return false;
	}
	const numeric = Number(value);
	if (isFinite(numeric)) {
		return numeric;
	}
	return value;
}

/**
 * Get path from value of "background-image"
 *
 */
function getBackgroundImagePath(value: string) {
	const origin = `${location.protocol}//${location.hostname}${
		location.port ? `:${location.port}` : ''
	}`;
	return decodeURI(
		value.replace(/^url\(["']?([^"']+)["']?\)$/i, '$1').replace(origin, ''),
	);
}
