import { FrozenPattyData, PrimitiveDatum } from './frozen-patty';
import './polyfill';

export function imports (el: HTMLElement, data: FrozenPattyData, attr: string) {
	el = el.cloneNode(true) as HTMLElement;
	for (const dataKeyName in data) {
		if (data.hasOwnProperty(dataKeyName)) {
			const datum = data[dataKeyName];
			const selector = `[data-${attr}*="${dataKeyName}"]`;
			const targetList = el.querySelectorAll(selector) as NodeListOf<HTMLElement>;
			if (Array.isArray(datum)) {
				const targetEl = targetList[0];
				if (!targetEl) {
					continue;
				}
				const listRoot = targetEl.closest(`[data-${attr}-list]`);
				if (!listRoot || listRoot && !listRoot.children.length) {
					continue;
				}
				const listItem = listRoot.children[0].cloneNode(true);
				while (datum.length > listRoot.children.length) {
					listRoot.appendChild(listItem.cloneNode(true));
				}
				const newChildren = listRoot.querySelectorAll(selector);
				Array.from(newChildren).forEach((child, i) => {
					if (datum[i] != null) {
						datumToElement(dataKeyName, datum[i] || '', child, attr);
					} else {
						listRoot.children[i].remove();
					}
				});
			} else {
				Array.from(targetList).forEach((targetEl, i) => {
					datumToElement(dataKeyName, datum, targetEl, attr);
				});
			}
		}
	}
	return el;
}

/**
 *
 */
function datumToElement (name: keyof FrozenPattyData, datum: PrimitiveDatum, el: Element, attr: string) {
	const nodeName = el.nodeName.toLowerCase();
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
		if (/^[a-z_-](?:[a-z0-9_-])*:[a-z_-](?:[a-z0-9_-])*(?:\([a-z-]+\))?/i.test(bindingFormat)) {
			const splitKey = bindingFormat.split(':');
			key = splitKey[0].trim();
			targetAttr = splitKey[1].trim();
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

		//
		// 属性による対応
		//
		if (targetAttr) {
			//
			// style属性
			//
			if (/^style\([a-z-]+\)$/i.test(targetAttr)) {
				const cssPropertyName = targetAttr.replace(/^style\(([a-z-]+)\)$/i, '$1');
				let cssValue = `${datum}`;
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
						// void
					}
				}
				el.setAttribute('style', `${cssPropertyName}: ${cssValue}`);
			//
			// data-*属性
			//
			} else if (/^data-/.test(targetAttr)) {
				el.setAttribute(targetAttr, `${datum}`);
			//
			// 一般属性
			//
			} else {
				switch (targetAttr) {
					case 'hidden': {
						(el as HTMLElement).hidden = !!datum;
						break;
					}
					case 'checked': {
						(el as HTMLInputElement).checked = !!datum;
						break;
					}
					case 'disabled': {
						(el as HTMLInputElement).disabled = !!datum;
						break;
					}
					case 'download': {
						// typeof changeDom.download === 'string'
						if (datum) {
							(el as HTMLAnchorElement).download = 'true';
						} else {
							el.removeAttribute('download');
						}
						break;
					}
					case 'target': {
						if (datum === '_blank') {
							(el as HTMLAnchorElement).target = '_blank';
						} else {
							el.removeAttribute('target');
						}
						break;
					}
					default: {
						el.setAttribute(targetAttr, `${datum}`);
					}
				}
			}
		//
		// 属性指定がない場合
		//
		} else {
			if (nodeName === 'input') {
				(el as HTMLInputElement).value = `${datum}`;
			} else {
				el.innerHTML = `${datum}`;
			}
		}
	}
}
