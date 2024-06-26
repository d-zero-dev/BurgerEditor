import type { Filter, PrimitiveDatum } from './types.js';

/**
 * Set value to an element
 *
 * ```html
 * <div [target-attribute] data-[attr]="[name]:[target-attribute]"></div>
 * ```
 *
 * @param el A target element
 * @param name A label name
 * @param datum A datum of value
 * @param attr Data attribute name for specifying the node that FrozenPatty treats as a field
 */
export function setValue(
	el: Element,
	name: string,
	datum: PrimitiveDatum,
	attr = 'field',
	filter?: Filter,
) {
	const bindingFormats = el.getAttribute(`data-${attr}`) || '';
	for (let bindingFormat of bindingFormats.split(/\s*,\s*/)) {
		bindingFormat = bindingFormat.trim();

		/**
		 * 抽出した対象キー
		 */
		let key: string;

		/**
		 * 対象属性
		 *
		 * `null`の場合は`innerHTML`が対象となる
		 * ただし要素がinput要素の場合は`value`に設定
		 */
		let targetAttr: string | null;

		//
		// 対象属性名の抽出
		//
		if (/^[_a-z-][\w-]*:[_a-z-][\w-]*(?:\([a-z-]+\))?/i.test(bindingFormat)) {
			const splitKey = bindingFormat.split(':');
			key = splitKey[0]?.trim() ?? '';
			targetAttr = splitKey[1]?.trim() ?? '';
		} else {
			key = bindingFormat.trim();
			targetAttr = null;
		}

		//
		// 対象キーが一致しなければスキップする
		//
		if (name !== key) {
			continue;
		}

		if (filter) {
			datum = filter(datum);
		}

		//
		// 属性による対応
		//
		if (targetAttr) {
			//
			// style属性
			//
			if (/^style\([a-z-]+\)$/i.test(targetAttr)) {
				const cssPropertyName = targetAttr.replace(/^style\(([a-z-]+)\)$/i, '$1');
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
				//
				// 属性
				//
			} else if (el instanceof HTMLElement) {
				setAttribute(el, targetAttr, datum);
			} else {
				// SVGElement or more
				el.setAttribute(targetAttr, `${datum}`);
			}
			//
			// 属性指定がない場合
			//
		} else {
			if (
				el instanceof HTMLInputElement ||
				el instanceof HTMLSelectElement ||
				el instanceof HTMLTextAreaElement
			) {
				el.value = `${datum}`;
			} else {
				el.innerHTML = `${datum}`;
			}
		}
	}
}

/**
 * Set attribute
 *
 * @param el Target HTML element
 * @param attr Attribute name
 * @param datum Datum
 *
 */
function setAttribute(el: HTMLElement, attr: string, datum: PrimitiveDatum) {
	if (datum == null) {
		el.removeAttribute(attr);
		return;
	}
	switch (attr) {
		case 'contenteditable': {
			switch (datum) {
				case 'true':
				case '': {
					el.contentEditable = 'true';
					break;
				}
				default: {
					el.removeAttribute(attr);
				}
			}
			break;
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
					el.removeAttribute(attr);
				}
			}
			break;
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
					el.removeAttribute(attr);
				}
			}
			break;
		}
		case 'hidden': {
			el.hidden = !!datum;
			break;
		}
		case 'spellcheck': {
			el.spellcheck = !!datum;
			break;
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
			break;
		}
		case 'async': {
			if (el instanceof HTMLScriptElement) {
				el.async = !!datum;
			} else {
				el.setAttribute(attr, `${datum}`);
			}
			break;
		}
		case 'autocomplete': {
			if (el instanceof HTMLInputElement || el instanceof HTMLFormElement) {
				// @ts-ignore
				el.autocomplete = datum ? `${datum}` : 'off';
			} else {
				el.setAttribute(attr, `${datum}`);
			}
			break;
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
				el.setAttribute(attr, `${datum}`);
			}
			break;
		}
		case 'autoplay': {
			if (el instanceof HTMLAudioElement || el instanceof HTMLVideoElement) {
				el.autoplay = datum === '' ? true : !!datum;
			} else {
				el.setAttribute(attr, `${datum}`);
			}
			break;
		}
		case 'checked': {
			if (el instanceof HTMLInputElement) {
				el.checked = datum === '' ? true : !!datum;
			} else {
				el.setAttribute(attr, `${datum}`);
			}
			break;
		}
		case 'cols': {
			if (el instanceof HTMLTextAreaElement) {
				const cols = toInt(datum);
				if (Number.isNaN(cols)) {
					el.removeAttribute(attr);
				} else {
					el.cols = cols;
				}
			} else {
				el.setAttribute(attr, `${datum}`);
			}
			break;
		}
		case 'colspan': {
			if (el instanceof HTMLTableCellElement) {
				const colSpan = toInt(datum);
				if (Number.isNaN(colSpan)) {
					el.removeAttribute(attr);
				} else {
					el.colSpan = colSpan;
				}
			} else {
				el.setAttribute(attr, `${datum}`);
			}
			break;
		}
		case 'controls': {
			if (el instanceof HTMLAudioElement || el instanceof HTMLVideoElement) {
				el.controls = datum === '' ? true : !!datum;
			} else {
				el.setAttribute(attr, `${datum}`);
			}
			break;
		}
		case 'default': {
			if (el instanceof HTMLTrackElement) {
				el.default = datum === '' ? true : !!datum;
			} else {
				el.setAttribute(attr, `${datum}`);
			}
			break;
		}
		case 'defer': {
			if (el instanceof HTMLScriptElement) {
				el.defer = !!datum;
			} else {
				el.setAttribute(attr, `${datum}`);
			}
			break;
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
				el.setAttribute(attr, `${datum}`);
			}
			break;
		}
		case 'download': {
			if (el instanceof HTMLAnchorElement) {
				if (datum || datum === '') {
					el.download = `${datum}`;
				} else {
					el.removeAttribute(attr);
				}
			} else {
				el.setAttribute(attr, `${datum}`);
			}
			break;
		}
		case 'high': {
			if (el instanceof HTMLMeterElement) {
				const high = toInt(datum);
				if (Number.isNaN(high)) {
					el.removeAttribute(attr);
				} else {
					el.high = high;
				}
			} else {
				el.setAttribute(attr, `${datum}`);
			}
			break;
		}
		case 'ismap': {
			if (el instanceof HTMLImageElement) {
				el.isMap = datum === '' ? true : !!datum;
			} else {
				el.setAttribute(attr, `${datum}`);
			}
			break;
		}
		case 'loop': {
			if (el instanceof HTMLAudioElement || el instanceof HTMLVideoElement) {
				el.loop = datum === '' ? true : !!datum;
			} else {
				el.setAttribute(attr, `${datum}`);
			}
			break;
		}
		case 'low': {
			if (el instanceof HTMLMeterElement) {
				const low = toInt(datum);
				if (Number.isNaN(low)) {
					el.removeAttribute(attr);
				} else {
					el.low = low;
				}
			} else {
				el.setAttribute(attr, `${datum}`);
			}
			break;
		}
		case 'max': {
			if (
				el instanceof HTMLInputElement ||
				el instanceof HTMLMeterElement ||
				el instanceof HTMLProgressElement
			) {
				const max = toInt(datum);
				if (Number.isNaN(max)) {
					el.removeAttribute(attr);
				} else {
					el.max = max;
				}
			} else {
				el.setAttribute(attr, `${datum}`);
			}
			break;
		}
		case 'maxlength': {
			if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
				const maxLength = toInt(datum);
				if (Number.isNaN(maxLength)) {
					el.removeAttribute(attr);
				} else {
					el.maxLength = Math.floor(maxLength);
				}
			} else {
				el.setAttribute(attr, `${datum}`);
			}
			break;
		}
		case 'min': {
			if (el instanceof HTMLInputElement || el instanceof HTMLMeterElement) {
				const min = toInt(datum);
				if (Number.isNaN(min)) {
					el.removeAttribute(attr);
				} else {
					el.min = min;
				}
			} else {
				el.setAttribute(attr, `${datum}`);
			}
			break;
		}
		case 'multiple': {
			if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) {
				el.multiple = datum === '' ? true : !!datum;
			} else {
				el.setAttribute(attr, `${datum}`);
			}
			break;
		}
		case 'novalidate': {
			if (el instanceof HTMLFormElement) {
				el.noValidate = datum === '' ? true : !!datum;
			} else {
				el.setAttribute(attr, `${datum}`);
			}
			break;
		}
		// ⚰️ Unsupported HTMLDetailsElement yet...
		// case 'open': {
		// 	if (el instanceof HTMLDetailsElement) {
		// 		el.open = datum === '' ? true : !!datum;
		// 	} else {
		// 		el.setAttribute(attr, `${datum}`);
		// 	}
		// 	break;
		// }
		case 'optimum': {
			if (el instanceof HTMLMeterElement) {
				const optimum = toInt(datum);
				if (Number.isNaN(optimum)) {
					el.removeAttribute(attr);
				} else {
					el.optimum = Math.floor(optimum);
				}
			} else {
				el.setAttribute(attr, `${datum}`);
			}
			break;
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
				el.setAttribute(attr, `${datum}`);
			}
			break;
		}
		case 'readonly': {
			if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
				el.readOnly = datum === '' ? true : !!datum;
			} else {
				el.setAttribute(attr, `${datum}`);
			}
			break;
		}
		case 'required': {
			if (
				el instanceof HTMLInputElement ||
				el instanceof HTMLSelectElement ||
				el instanceof HTMLTextAreaElement
			) {
				el.required = datum === '' ? true : !!datum;
			} else {
				el.setAttribute(attr, `${datum}`);
			}
			break;
		}
		case 'reversed': {
			if (el instanceof HTMLOListElement) {
				el.reversed = datum === '' ? true : !!datum;
			} else {
				el.setAttribute(attr, `${datum}`);
			}
			break;
		}
		case 'rows': {
			if (el instanceof HTMLTextAreaElement) {
				const rows = toInt(datum);
				if (Number.isNaN(rows)) {
					el.removeAttribute(attr);
				} else {
					el.rows = Math.floor(rows);
				}
			} else {
				el.setAttribute(attr, `${datum}`);
			}
			break;
		}
		case 'rowspan': {
			if (el instanceof HTMLTableCellElement) {
				const rowSpan = toInt(datum);
				if (Number.isNaN(rowSpan)) {
					el.removeAttribute(attr);
				} else {
					el.rowSpan = Math.floor(rowSpan);
				}
			} else {
				el.setAttribute(attr, `${datum}`);
			}
			break;
		}
		case 'size': {
			if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) {
				const size = toInt(datum);
				if (Number.isNaN(size)) {
					el.removeAttribute(attr);
				} else {
					el.size = size;
				}
			} else {
				el.setAttribute(attr, `${datum}`);
			}
			break;
		}
		case 'span': {
			if (el instanceof HTMLTableColElement) {
				const span = toInt(datum);
				if (Number.isNaN(span)) {
					el.removeAttribute(attr);
				} else {
					el.span = span;
				}
			} else {
				el.setAttribute(attr, `${datum}`);
			}
			break;
		}
		case 'start': {
			if (el instanceof HTMLOListElement) {
				const start = toInt(datum);
				if (Number.isNaN(start)) {
					el.removeAttribute(attr);
				} else {
					el.start = start;
				}
			} else {
				el.setAttribute(attr, `${datum}`);
			}
			break;
		}
		case 'step': {
			if (el instanceof HTMLInputElement) {
				if (datum === 'any') {
					el.step = datum;
					break;
				}
				const step = toNum(datum);
				if (Number.isNaN(step)) {
					el.removeAttribute(attr);
				} else {
					el.step = step.toString(10);
				}
			} else {
				el.setAttribute(attr, `${datum}`);
			}
			break;
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
					el.removeAttribute(attr);
				}
			} else {
				el.setAttribute(attr, `${datum}`);
			}
			break;
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
			el.setAttribute(attr, `${datum}`);
		}
	}
}

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

function toInt(datum: boolean | string | number) {
	return Math.floor(toNum(datum));
}
