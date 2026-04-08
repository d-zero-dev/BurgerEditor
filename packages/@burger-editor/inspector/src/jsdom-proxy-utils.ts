/**
 * Make jsdom's CSSStyleDeclaration iterable
 * jsdom's CSSStyleDeclaration has length and [index] but no Symbol.iterator
 * @param style CSSStyleDeclaration from jsdom
 * @returns Iterable wrapper
 */
function makeStyleIterable(style: CSSStyleDeclaration): Iterable<string> {
	return {
		*[Symbol.iterator]() {
			// eslint-disable-next-line unicorn/no-for-loop
			for (let i = 0; i < style.length; i++) {
				yield style[i]!;
			}
		},
	};
}

/**
 * Create Proxy of jsdom HTMLElement to make el.style iterable
 * jsdom's el.style is not iterable, but browser's is
 * @param el HTMLElement from jsdom
 * @returns Proxied HTMLElement where el.style is iterable
 */
export function proxyJsdomElementForIterableStyle(el: HTMLElement): HTMLElement {
	const originalStyle = el.style;

	return new Proxy(el, {
		get(target, prop) {
			if (prop === 'style') {
				return Object.assign(makeStyleIterable(originalStyle), {
					getPropertyValue: originalStyle.getPropertyValue.bind(originalStyle),
				});
			}
			return Reflect.get(target, prop);
		},
	});
}
