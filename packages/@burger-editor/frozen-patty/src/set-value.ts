import type { Filter, PrimitiveDatum } from './types.js';

import { kebabCase } from '@burger-editor/utils';

import { parseFields } from './parse-fields.js';
import {
	propInElement,
	replaceNode,
	sanitizeAttributeValue,
	sanitizeHtml,
} from './utils.js';

/**
 * Set value to an element
 *
 * ```html
 * <div [target-attribute] data-[attr]="[name]:[target-attribute]"></div>
 * ```
 * @param el A target element
 * @param name A label name
 * @param datum A datum of value
 * @param attr Data attribute name for specifying the node that FrozenPatty treats as a field
 * @param filter
 * @param xssSanitize Enable XSS protection
 */
export function setValue(
	el: Element,
	name: string,
	datum: PrimitiveDatum,
	attr = 'field',
	filter?: Filter,
	xssSanitize = true,
) {
	const rawValue = el.getAttribute(`data-${attr}`);
	const fields = parseFields(rawValue ?? '');

	const field = fields.find((field) => field.fieldName === name);

	if (!field) {
		return;
	}

	const { propName } = field;

	if (filter) {
		datum = filter(datum);
	}

	if (!propName) {
		setContent(el, datum, undefined, xssSanitize);
		return;
	}

	if (propName === 'style' && el instanceof HTMLElement) {
		el.style.cssText = `${datum}`;
		return;
	}

	if (/^style\([a-z-]+\)$/i.test(propName)) {
		const cssPropertyName = propName.replace(/^style\(([a-z-]+)\)$/i, '$1');
		let cssValue: string;
		switch (cssPropertyName) {
			case 'background-image': {
				// Using CSS method would create absolute URLs with host
				// This would prevent migration from demo to production server
				// Using simple string insertion (setAttribute) instead
				// URL may not contain multibyte or whitespace characters, but escape anyway
				const url = encodeURI(`${datum}`);
				cssValue = `url(${url})`;
				break;
			}
			//
			// TODO: Handle other cases where values need units
			//
			default: {
				cssValue = `${datum}`;
			}
		}
		el.setAttribute('style', `${cssPropertyName}: ${cssValue}`);
		return;
	}

	if (el instanceof HTMLElement) {
		// HTMLElement
		set(el, attr, propName, datum, xssSanitize);
		return;
	}

	// SVGElement or more
	// ↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓

	// Check attribute value if XSS protection is enabled
	if (xssSanitize) {
		const safeValue = sanitizeAttributeValue(propName, `${datum}`);
		if (safeValue !== null) {
			el.setAttribute(propName, safeValue);
		}
		return;
	}

	el.setAttribute(propName, `${datum}`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ElementConstructor = abstract new (...args: any[]) => HTMLElement;

/**
 * Set a boolean attribute on an element via its DOM property.
 * Empty string is treated as true (HTML boolean attribute convention).
 * Falls back to setAttribute if the element doesn't match any of the expected types.
 * @param el
 * @param datum
 * @param types
 * @param prop
 * @param emptyIsTrue
 * @returns true if handled
 */
function setBooleanAttr(
	el: HTMLElement,
	datum: Exclude<PrimitiveDatum, null | undefined>,
	types: ElementConstructor[],
	prop: string,
	emptyIsTrue = true,
): boolean {
	if (types.some((T) => el instanceof T)) {
		// SAFETY: prop is always a hardcoded string literal from setBooleanAttrByName
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(el as any)[prop] = emptyIsTrue ? (datum === '' ? true : !!datum) : !!datum;
		return true;
	}
	return false;
}

/**
 * Set an integer attribute on an element via its DOM property.
 * Removes the attribute if the parsed value is NaN.
 * Falls back to setAttribute if the element doesn't match any of the expected types.
 * @param el
 * @param name
 * @param datum
 * @param types
 * @param prop
 * @param floor
 * @returns true if handled
 */
function setIntegerAttr(
	el: HTMLElement,
	name: string,
	datum: Exclude<PrimitiveDatum, null | undefined>,
	types: ElementConstructor[],
	prop: string,
	floor = false,
): boolean {
	if (types.some((T) => el instanceof T)) {
		const val = toInt(datum);
		if (Number.isNaN(val)) {
			el.removeAttribute(name);
		} else {
			// SAFETY: prop is always a hardcoded string literal from setIntegerAttrByName
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(el as any)[prop] = floor ? Math.floor(val) : val;
		}
		return true;
	}
	return false;
}

/**
 *
 * @param el
 * @param prefix
 * @param name
 * @param datum
 * @param xssSanitize
 */
function set(
	el: HTMLElement,
	prefix: string,
	name: string,
	datum: PrimitiveDatum,
	xssSanitize = true,
) {
	if (datum == null) {
		el.removeAttribute(name);
		return;
	}

	switch (name) {
		case 'text': {
			setContent(el, datum, false, xssSanitize);
			return;
		}
		case 'html': {
			setContent(el, datum, true, xssSanitize);
			return;
		}
		case 'node': {
			if (typeof datum !== 'string') {
				return;
			}

			replaceNode(el, datum, prefix, xssSanitize);
			return;
		}
	}

	// If XSS protection is enabled
	if (xssSanitize) {
		// Don't set event handler attributes (starting with 'on')
		if (name.toLowerCase().startsWith('on')) {
			return;
		}

		const beforeSanitize = datum;
		datum = sanitizeAttributeValue(name, datum);

		// If sanitization results in null value (except when original value was null), don't change the value
		if (datum === null && beforeSanitize !== null) {
			return;
		}
	}

	if (datum == null) {
		el.removeAttribute(name);
		return;
	}

	// Custom elements
	if (el.localName.includes('-')) {
		el.setAttribute(name, `${datum}`);
		return;
	}

	if (!name.startsWith('data-') && !propInElement(el, name)) {
		const dataAttr = `data-${prefix}-${kebabCase(name)}`;
		if (el.hasAttribute(dataAttr)) {
			el.setAttribute(dataAttr, `${datum}`);
		}
		return;
	}

	if (setSpecialAttr(el, name, datum)) {
		return;
	}

	if (setBooleanAttrByName(el, name, datum)) {
		return;
	}

	if (setIntegerAttrByName(el, name, datum)) {
		return;
	}

	el.setAttribute(name, `${datum}`);
}

/**
 * Handle attributes with unique logic that doesn't fit boolean/integer patterns.
 * @param el
 * @param name
 * @param datum
 * @returns true if handled
 */
function setSpecialAttr(
	el: HTMLElement,
	name: string,
	datum: Exclude<PrimitiveDatum, null | undefined>,
): boolean {
	switch (name) {
		case 'contenteditable': {
			switch (datum) {
				case true:
				case 'true':
				case '': {
					el.contentEditable = 'true';
					break;
				}
				default: {
					el.removeAttribute(name);
				}
			}
			return true;
		}
		case 'dir': {
			switch (datum) {
				case 'ltr':
				case 'rtl': {
					el.dir = datum;
					break;
				}
				default: {
					el.removeAttribute(name);
				}
			}
			return true;
		}
		case 'draggable': {
			if (typeof datum === 'boolean') {
				el.draggable = datum;
			} else {
				switch (datum) {
					case 'true': {
						el.draggable = true;
						break;
					}
					case 'false': {
						el.draggable = false;
						break;
					}
					default: {
						el.removeAttribute(name);
					}
				}
			}
			return true;
		}
		case 'hidden': {
			if (datum === 'until-found') {
				el.setAttribute(name, datum);
			} else {
				el.hidden = !!datum;
			}
			return true;
		}
		case 'spellcheck': {
			el.spellcheck = !!datum;
			return true;
		}
		case 'tabindex': {
			let i: number;
			if (typeof datum === 'boolean') {
				i = datum ? 0 : -1;
			} else if (typeof datum === 'string') {
				i = Number.parseInt(datum, 10);
			} else {
				i = datum ?? -1;
			}
			el.tabIndex = Number.isNaN(i) ? -1 : Math.floor(i);
			return true;
		}
		case 'autocomplete': {
			if (el instanceof HTMLInputElement || el instanceof HTMLFormElement) {
				el.setAttribute(name, datum ? `${datum}` : 'off');
			} else {
				el.setAttribute(name, `${datum}`);
			}
			return true;
		}
		case 'download': {
			if (el instanceof HTMLAnchorElement) {
				if (datum || datum === '') {
					el.download = `${datum}`;
				} else {
					el.removeAttribute(name);
				}
			} else {
				el.setAttribute(name, `${datum}`);
			}
			return true;
		}
		case 'preload': {
			if (el instanceof HTMLAudioElement || el instanceof HTMLVideoElement) {
				switch (datum) {
					case '':
					case 'auto':
					case 'metadata': {
						el.preload = datum;
						break;
					}
					default: {
						el.preload = 'none';
					}
				}
			} else {
				el.setAttribute(name, `${datum}`);
			}
			return true;
		}
		case 'step': {
			if (el instanceof HTMLInputElement) {
				if (datum === 'any') {
					el.step = datum;
				} else {
					const step = toNum(datum);
					if (Number.isNaN(step)) {
						el.removeAttribute(name);
					} else {
						el.step = step.toString(10);
					}
				}
			} else {
				el.setAttribute(name, `${datum}`);
			}
			return true;
		}
		case 'target': {
			if (
				el instanceof HTMLAnchorElement ||
				el instanceof HTMLAreaElement ||
				el instanceof HTMLFormElement
			) {
				if (datum) {
					el.target = `${datum}`;
				} else {
					el.removeAttribute(name);
				}
			} else {
				el.setAttribute(name, `${datum}`);
			}
			return true;
		}
		default: {
			return false;
		}
	}
}

/**
 * Handle boolean HTML attributes via their DOM properties.
 * @param el
 * @param name
 * @param datum
 * @returns true if handled
 */
function setBooleanAttrByName(
	el: HTMLElement,
	name: string,
	datum: Exclude<PrimitiveDatum, null | undefined>,
): boolean {
	switch (name) {
		case 'async': {
			return setBooleanAttr(el, datum, [HTMLScriptElement], 'async', false);
		}
		case 'autofocus': {
			return setBooleanAttr(
				el,
				datum,
				[HTMLButtonElement, HTMLInputElement, HTMLSelectElement, HTMLTextAreaElement],
				'autofocus',
			);
		}
		case 'autoplay': {
			return setBooleanAttr(el, datum, [HTMLAudioElement, HTMLVideoElement], 'autoplay');
		}
		case 'checked': {
			return setBooleanAttr(el, datum, [HTMLInputElement], 'checked');
		}
		case 'controls': {
			return setBooleanAttr(el, datum, [HTMLAudioElement, HTMLVideoElement], 'controls');
		}
		case 'default': {
			return setBooleanAttr(el, datum, [HTMLTrackElement], 'default');
		}
		case 'defer': {
			return setBooleanAttr(el, datum, [HTMLScriptElement], 'defer', false);
		}
		case 'disabled': {
			return setBooleanAttr(
				el,
				datum,
				[
					HTMLButtonElement,
					HTMLFieldSetElement,
					HTMLInputElement,
					HTMLOptGroupElement,
					HTMLOptionElement,
					HTMLSelectElement,
					HTMLTextAreaElement,
				],
				'disabled',
			);
		}
		case 'ismap': {
			return setBooleanAttr(el, datum, [HTMLImageElement], 'isMap');
		}
		case 'loop': {
			return setBooleanAttr(el, datum, [HTMLAudioElement, HTMLVideoElement], 'loop');
		}
		case 'multiple': {
			return setBooleanAttr(el, datum, [HTMLInputElement, HTMLSelectElement], 'multiple');
		}
		case 'novalidate': {
			return setBooleanAttr(el, datum, [HTMLFormElement], 'noValidate');
		}
		case 'open': {
			return setBooleanAttr(el, datum, [HTMLDetailsElement], 'open');
		}
		case 'readonly': {
			return setBooleanAttr(
				el,
				datum,
				[HTMLInputElement, HTMLTextAreaElement],
				'readOnly',
			);
		}
		case 'required': {
			return setBooleanAttr(
				el,
				datum,
				[HTMLInputElement, HTMLSelectElement, HTMLTextAreaElement],
				'required',
			);
		}
		case 'reversed': {
			return setBooleanAttr(el, datum, [HTMLOListElement], 'reversed');
		}
		default: {
			return false;
		}
	}
}

/**
 * Handle integer HTML attributes via their DOM properties.
 * @param el
 * @param name
 * @param datum
 * @returns true if handled
 */
function setIntegerAttrByName(
	el: HTMLElement,
	name: string,
	datum: Exclude<PrimitiveDatum, null | undefined>,
): boolean {
	switch (name) {
		case 'cols': {
			return setIntegerAttr(el, name, datum, [HTMLTextAreaElement], 'cols');
		}
		case 'colspan': {
			return setIntegerAttr(el, name, datum, [HTMLTableCellElement], 'colSpan');
		}
		case 'high': {
			return setIntegerAttr(el, name, datum, [HTMLMeterElement], 'high');
		}
		case 'low': {
			return setIntegerAttr(el, name, datum, [HTMLMeterElement], 'low');
		}
		case 'max': {
			return setIntegerAttr(
				el,
				name,
				datum,
				[HTMLInputElement, HTMLMeterElement, HTMLProgressElement],
				'max',
			);
		}
		case 'maxlength': {
			return setIntegerAttr(
				el,
				name,
				datum,
				[HTMLInputElement, HTMLTextAreaElement],
				'maxLength',
				true,
			);
		}
		case 'min': {
			return setIntegerAttr(el, name, datum, [HTMLInputElement, HTMLMeterElement], 'min');
		}
		case 'optimum': {
			return setIntegerAttr(el, name, datum, [HTMLMeterElement], 'optimum', true);
		}
		case 'rows': {
			return setIntegerAttr(el, name, datum, [HTMLTextAreaElement], 'rows', true);
		}
		case 'rowspan': {
			return setIntegerAttr(el, name, datum, [HTMLTableCellElement], 'rowSpan', true);
		}
		case 'size': {
			return setIntegerAttr(
				el,
				name,
				datum,
				[HTMLInputElement, HTMLSelectElement],
				'size',
			);
		}
		case 'span': {
			return setIntegerAttr(el, name, datum, [HTMLTableColElement], 'span');
		}
		case 'start': {
			return setIntegerAttr(el, name, datum, [HTMLOListElement], 'start');
		}
		default: {
			return false;
		}
	}
}

/**
 *
 * @param el
 * @param datum
 * @param asHtml
 * @param xssSanitize
 */
export function setContent(
	el: Element,
	datum: PrimitiveDatum,
	asHtml = true,
	xssSanitize = true,
) {
	if (
		el instanceof HTMLInputElement ||
		el instanceof HTMLSelectElement ||
		el instanceof HTMLTextAreaElement ||
		el instanceof HTMLOutputElement
	) {
		if (
			el instanceof HTMLInputElement &&
			(el.type === 'radio' || el.type === 'checkbox')
		) {
			// Boolean values are always set directly regardless of value attribute
			if (typeof datum === 'boolean') {
				el.checked = datum;
				return;
			}

			// Checkbox/radio with value attribute: traditional value comparison
			if (el.hasAttribute('value')) {
				el.checked = el.value === `${datum}`;
				return;
			}

			// Checkbox without value attribute: switch-like behavior (string boolean processing)
			if (datum === 'true') {
				el.checked = true;
				return;
			}

			if (datum === 'false') {
				el.checked = false;
				return;
			}

			// Other values default to false
			el.checked = false;
			return;
		}
		el.value = `${datum}`;
		return;
	}
	if (asHtml) {
		// Sanitize HTML if XSS protection is enabled
		const htmlStr = datum == null ? '' : `${datum}`;

		if (xssSanitize && typeof htmlStr === 'string') {
			// sanitizeHtml will now replace dangerous elements instead of removing them
			el.innerHTML = sanitizeHtml(htmlStr);
		} else {
			el.innerHTML = htmlStr;
		}
		return;
	}
	// No need to sanitize textContent (automatically escaped)
	el.textContent = datum == null ? '' : `${datum}`;
}

/**
 *
 * @param datum
 */
function toNum(datum: boolean | string | number) {
	let i: number;
	if (typeof datum === 'boolean') {
		i = +datum;
	} else if (typeof datum === 'string') {
		i = Number.parseFloat(datum);
	} else {
		i = datum;
	}
	return i;
}

/**
 *
 * @param datum
 */
function toInt(datum: boolean | string | number) {
	return Math.floor(toNum(datum));
}
