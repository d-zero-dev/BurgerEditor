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
 * jsdom's el.style is not iterable, but browser's is. The returned style
 * object preserves the standard `length` + `item()` + `getPropertyValue()`
 * interface so consumers that use indexed access (e.g. `exportStyleOptions`)
 * keep working.
 * @param el HTMLElement from jsdom
 * @returns Proxied HTMLElement where el.style is iterable
 */
export function proxyJsdomElementForIterableStyle(el: HTMLElement): HTMLElement {
	const originalStyle = el.style;

	return new Proxy(el, {
		get(target, prop) {
			if (prop === 'style') {
				const iterable = makeStyleIterable(originalStyle);
				return new Proxy(originalStyle, {
					get(styleTarget, styleProp) {
						if (styleProp === Symbol.iterator) {
							return iterable[Symbol.iterator].bind(iterable);
						}
						const value = Reflect.get(styleTarget, styleProp);
						return typeof value === 'function' ? value.bind(styleTarget) : value;
					},
				});
			}
			return Reflect.get(target, prop);
		},
	});
}
