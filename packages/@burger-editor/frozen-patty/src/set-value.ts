import type { Filter, PrimitiveDatum } from './types.js';

import { fieldNameParser } from './field-name-parser.js';
import { kebabCase } from './utils.js';

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
 */
export function setValue(
	el: Element,
	name: string,
	datum: PrimitiveDatum,
	attr = 'field',
	filter?: Filter,
) {
	const rawValue = el.getAttribute(`data-${attr}`);
	const fieldList = rawValue?.split(/\s*,\s*/) ?? [];
	for (const field of fieldList) {
		const { fieldName, propName } = fieldNameParser(field);

		if (name !== fieldName) {
			continue;
		}

		if (filter) {
			datum = filter(datum);
		}

		// console.log({ name, field, fieldName, propName, datum, el: el.innerHTML });

		if (propName) {
			if (/^style\([a-z-]+\)$/i.test(propName)) {
				const cssPropertyName = propName.replace(/^style\(([a-z-]+)\)$/i, '$1');
				let cssValue: string;
				switch (cssPropertyName) {
					case 'background-image': {
						//
						// NGパターン
						// $changeDom.css(cssPropertyName, 'url("' + value + '")');
						//
						// cssメソッドを経由すると styleAPIを使用するので URLがホストを含めた絶対パスになる
						// デモサーバーから本番サーバーへの移行ができなくなってしまうので避ける
						// 単純な文字列を流し込む（setAttributeを利用）
						// urlはマルチバイト文字や空白記号を含まないはずであるがエスケープする
						const url = encodeURI(`${datum}`);
						cssValue = `url(${url})`;
						break;
					}
					//
					// TODO: 他にもvalueに単位が必要なケースなどに対応したい
					//
					default: {
						cssValue = `${datum}`;
					}
				}
				el.setAttribute('style', `${cssPropertyName}: ${cssValue}`);
			} else if (el instanceof HTMLElement) {
				// HTMLElement
				set(el, attr, propName, datum);
			} else {
				// SVGElement or more
				el.setAttribute(propName, `${datum}`);
			}
			return;
		}

		setContent(el, datum);
	}
}

/**
 *
 * @param el
 * @param prefix
 * @param name
 * @param datum
 */
function set(el: HTMLElement, prefix: string, name: string, datum: PrimitiveDatum) {
	if (datum == null) {
		el.removeAttribute(name);
		return;
	}

	switch (name) {
		case 'text': {
			setContent(el, datum, false);
			return;
		}
		case 'html': {
			setContent(el, datum, true);
			return;
		}
		case 'node': {
			if (typeof datum !== 'string') {
				return;
			}

			const nodeName = el.localName ?? el.nodeName.toLowerCase();
			if (nodeName === datum.toLowerCase()) {
				return;
			}

			const node = (el.ownerDocument ?? document).createElement(`${datum}`);
			for (const child of el.childNodes) {
				node.append(child.cloneNode(true));
			}
			for (const { name, value } of el.attributes) {
				node.setAttribute(name, value);
			}
			el.replaceWith(node);
			return;
		}
	}

	if (!name.startsWith('data-') && !(name in el)) {
		const dataAttr = `data-${prefix}-${kebabCase(name)}`;
		if (el.hasAttribute(dataAttr)) {
			el.setAttribute(dataAttr, `${datum}`);
		}
		return;
	}

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
			return;
		}
		case 'dir': {
			switch (datum) {
				case 'ltr':
				case 'rtl': {
					el.dir = datum;
					break;
				}
				// case 'auto':
				default: {
					el.removeAttribute(name);
				}
			}
			return;
		}
		case 'draggable': {
			if (typeof datum === 'boolean') {
				el.draggable = datum;
				break;
			}
			switch (datum) {
				case 'true': {
					el.draggable = true;
					break;
				}
				case 'false': {
					el.draggable = false;
					break;
				}
				// case 'auto':
				default: {
					el.removeAttribute(name);
				}
			}
			return;
		}
		case 'hidden': {
			if (datum === 'until-found') {
				el.setAttribute(name, datum);
				return;
			}
			el.hidden = !!datum;
			return;
		}
		case 'spellcheck': {
			el.spellcheck = !!datum;
			return;
		}
		case 'tabindex': {
			let i: number;
			if (typeof datum === 'boolean') {
				i = datum ? 0 : -1;
			} else if (typeof datum === 'string') {
				i = Number.parseInt(datum, 10);
			} else {
				i = datum;
			}
			el.tabIndex = Number.isNaN(i) ? -1 : Math.floor(i);
			return;
		}
		case 'async': {
			if (el instanceof HTMLScriptElement) {
				el.async = !!datum;
			} else {
				el.setAttribute(name, `${datum}`);
			}
			return;
		}
		case 'autocomplete': {
			if (el instanceof HTMLInputElement || el instanceof HTMLFormElement) {
				// @ts-ignore
				el.autocomplete = datum ? `${datum}` : 'off';
			} else {
				el.setAttribute(name, `${datum}`);
			}
			return;
		}
		case 'autofocus': {
			if (
				el instanceof HTMLButtonElement ||
				el instanceof HTMLInputElement ||
				el instanceof HTMLSelectElement ||
				el instanceof HTMLTextAreaElement
			) {
				el.autofocus = datum === '' ? true : !!datum;
			} else {
				el.setAttribute(name, `${datum}`);
			}
			return;
		}
		case 'autoplay': {
			if (el instanceof HTMLAudioElement || el instanceof HTMLVideoElement) {
				el.autoplay = datum === '' ? true : !!datum;
			} else {
				el.setAttribute(name, `${datum}`);
			}
			return;
		}
		case 'checked': {
			if (el instanceof HTMLInputElement) {
				el.checked = datum === '' ? true : !!datum;
			} else {
				el.setAttribute(name, `${datum}`);
			}
			return;
		}
		case 'cols': {
			if (el instanceof HTMLTextAreaElement) {
				const cols = toInt(datum);
				if (Number.isNaN(cols)) {
					el.removeAttribute(name);
				} else {
					el.cols = cols;
				}
			} else {
				el.setAttribute(name, `${datum}`);
			}
			return;
		}
		case 'colspan': {
			if (el instanceof HTMLTableCellElement) {
				const colSpan = toInt(datum);
				if (Number.isNaN(colSpan)) {
					el.removeAttribute(name);
				} else {
					el.colSpan = colSpan;
				}
			} else {
				el.setAttribute(name, `${datum}`);
			}
			return;
		}
		case 'controls': {
			if (el instanceof HTMLAudioElement || el instanceof HTMLVideoElement) {
				el.controls = datum === '' ? true : !!datum;
			} else {
				el.setAttribute(name, `${datum}`);
			}
			return;
		}
		case 'default': {
			if (el instanceof HTMLTrackElement) {
				el.default = datum === '' ? true : !!datum;
			} else {
				el.setAttribute(name, `${datum}`);
			}
			return;
		}
		case 'defer': {
			if (el instanceof HTMLScriptElement) {
				el.defer = !!datum;
			} else {
				el.setAttribute(name, `${datum}`);
			}
			return;
		}
		case 'disabled': {
			if (
				el instanceof HTMLButtonElement ||
				el instanceof HTMLFieldSetElement ||
				el instanceof HTMLInputElement ||
				el instanceof HTMLOptGroupElement ||
				el instanceof HTMLOptionElement ||
				el instanceof HTMLSelectElement ||
				el instanceof HTMLTextAreaElement
			) {
				el.disabled = datum === '' ? true : !!datum;
			} else {
				el.setAttribute(name, `${datum}`);
			}
			return;
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
			return;
		}
		case 'high': {
			if (el instanceof HTMLMeterElement) {
				const high = toInt(datum);
				if (Number.isNaN(high)) {
					el.removeAttribute(name);
				} else {
					el.high = high;
				}
			} else {
				el.setAttribute(name, `${datum}`);
			}
			return;
		}
		case 'ismap': {
			if (el instanceof HTMLImageElement) {
				el.isMap = datum === '' ? true : !!datum;
			} else {
				el.setAttribute(name, `${datum}`);
			}
			return;
		}
		case 'loop': {
			if (el instanceof HTMLAudioElement || el instanceof HTMLVideoElement) {
				el.loop = datum === '' ? true : !!datum;
			} else {
				el.setAttribute(name, `${datum}`);
			}
			return;
		}
		case 'low': {
			if (el instanceof HTMLMeterElement) {
				const low = toInt(datum);
				if (Number.isNaN(low)) {
					el.removeAttribute(name);
				} else {
					el.low = low;
				}
			} else {
				el.setAttribute(name, `${datum}`);
			}
			return;
		}
		case 'max': {
			if (
				el instanceof HTMLInputElement ||
				el instanceof HTMLMeterElement ||
				el instanceof HTMLProgressElement
			) {
				const max = toInt(datum);
				if (Number.isNaN(max)) {
					el.removeAttribute(name);
				} else {
					el.max = max;
				}
			} else {
				el.setAttribute(name, `${datum}`);
			}
			return;
		}
		case 'maxlength': {
			if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
				const maxLength = toInt(datum);
				if (Number.isNaN(maxLength)) {
					el.removeAttribute(name);
				} else {
					el.maxLength = Math.floor(maxLength);
				}
			} else {
				el.setAttribute(name, `${datum}`);
			}
			return;
		}
		case 'min': {
			if (el instanceof HTMLInputElement || el instanceof HTMLMeterElement) {
				const min = toInt(datum);
				if (Number.isNaN(min)) {
					el.removeAttribute(name);
				} else {
					el.min = min;
				}
			} else {
				el.setAttribute(name, `${datum}`);
			}
			return;
		}
		case 'multiple': {
			if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) {
				el.multiple = datum === '' ? true : !!datum;
			} else {
				el.setAttribute(name, `${datum}`);
			}
			return;
		}
		case 'novalidate': {
			if (el instanceof HTMLFormElement) {
				el.noValidate = datum === '' ? true : !!datum;
			} else {
				el.setAttribute(name, `${datum}`);
			}
			return;
		}
		case 'open': {
			if (el instanceof HTMLDetailsElement) {
				el.open = datum === '' ? true : !!datum;
			} else {
				el.setAttribute(name, `${datum}`);
			}
			break;
		}
		case 'optimum': {
			if (el instanceof HTMLMeterElement) {
				const optimum = toInt(datum);
				if (Number.isNaN(optimum)) {
					el.removeAttribute(name);
				} else {
					el.optimum = Math.floor(optimum);
				}
			} else {
				el.setAttribute(name, `${datum}`);
			}
			return;
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
			return;
		}
		case 'readonly': {
			if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
				el.readOnly = datum === '' ? true : !!datum;
			} else {
				el.setAttribute(name, `${datum}`);
			}
			return;
		}
		case 'required': {
			if (
				el instanceof HTMLInputElement ||
				el instanceof HTMLSelectElement ||
				el instanceof HTMLTextAreaElement
			) {
				el.required = datum === '' ? true : !!datum;
			} else {
				el.setAttribute(name, `${datum}`);
			}
			return;
		}
		case 'reversed': {
			if (el instanceof HTMLOListElement) {
				el.reversed = datum === '' ? true : !!datum;
			} else {
				el.setAttribute(name, `${datum}`);
			}
			return;
		}
		case 'rows': {
			if (el instanceof HTMLTextAreaElement) {
				const rows = toInt(datum);
				if (Number.isNaN(rows)) {
					el.removeAttribute(name);
				} else {
					el.rows = Math.floor(rows);
				}
			} else {
				el.setAttribute(name, `${datum}`);
			}
			return;
		}
		case 'rowspan': {
			if (el instanceof HTMLTableCellElement) {
				const rowSpan = toInt(datum);
				if (Number.isNaN(rowSpan)) {
					el.removeAttribute(name);
				} else {
					el.rowSpan = Math.floor(rowSpan);
				}
			} else {
				el.setAttribute(name, `${datum}`);
			}
			return;
		}
		case 'size': {
			if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) {
				const size = toInt(datum);
				if (Number.isNaN(size)) {
					el.removeAttribute(name);
				} else {
					el.size = size;
				}
			} else {
				el.setAttribute(name, `${datum}`);
			}
			return;
		}
		case 'span': {
			if (el instanceof HTMLTableColElement) {
				const span = toInt(datum);
				if (Number.isNaN(span)) {
					el.removeAttribute(name);
				} else {
					el.span = span;
				}
			} else {
				el.setAttribute(name, `${datum}`);
			}
			return;
		}
		case 'start': {
			if (el instanceof HTMLOListElement) {
				const start = toInt(datum);
				if (Number.isNaN(start)) {
					el.removeAttribute(name);
				} else {
					el.start = start;
				}
			} else {
				el.setAttribute(name, `${datum}`);
			}
			return;
		}
		case 'step': {
			if (el instanceof HTMLInputElement) {
				if (datum === 'any') {
					el.step = datum;
					break;
				}
				const step = toNum(datum);
				if (Number.isNaN(step)) {
					el.removeAttribute(name);
				} else {
					el.step = step.toString(10);
				}
			} else {
				el.setAttribute(name, `${datum}`);
			}
			return;
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
			return;
		}
		// case 'accesskey':
		// case 'class':
		// case 'contextmenu':
		// case 'dropzone': // breakable support
		// case 'id':
		// case 'itemid':
		// case 'itemprop':
		// case 'itemref':
		// case 'itemscope':
		// case 'itemtype':
		// case 'lang':
		// case 'slot': // breakable support
		// case 'style':
		// case 'title':
		// case 'translate': // breakable support
		// case 'accept':
		// case 'accept-charset':
		// case 'action':
		// case 'align':
		// case 'alt':
		// case 'cite':
		// case 'coords':
		// case 'datetime':
		// case 'enctype':
		// case 'for':
		// case 'headers':
		// case 'href':
		// case 'hreflang':
		// case 'kind':
		// case 'label':
		// case 'list':
		// case 'media':
		// case 'method':
		// case 'name':
		// case 'pattern':
		// case 'placeholder':
		// case 'poster':
		// case 'pubdate':
		// case 'rel':
		// case 'sandbox':
		// case 'src':
		// case 'srcdoc':
		// case 'srclang':
		// case 'summary':
		// case 'type':
		// case 'usemap':
		// case 'value':
		// case 'wrap':
		// and Data-* attributes
		default: {
			el.setAttribute(name, `${datum}`);
		}
	}
}

/**
 *
 * @param el
 * @param datum
 * @param asHtml
 */
export function setContent(el: Element, datum: PrimitiveDatum, asHtml = true) {
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
			if (typeof datum === 'boolean') {
				el.checked = datum;
				return;
			}
			el.checked = el.value === `${datum}`;
			return;
		}
		el.value = `${datum}`;
		return;
	}
	if (asHtml) {
		el.innerHTML = datum == null ? '' : `${datum}`;
		return;
	}
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
