import * as combinateSoundMarks from 'jaco/fn/combinateSoundMarks.js';

/**
 *
 * @param datum
 */
export function valueFilter<T>(datum: T): T {
	if (typeof datum !== 'string') {
		return datum;
	}
	let str: string = datum;

	// @ts-ignore
	str = combinateSoundMarks.default(str);

	// Remove data-bgb/data-bgi/data-bge-* attributes
	if (str.trim().startsWith('<')) {
		const d = document.createElement('div');
		d.innerHTML = str;
		const elements = d.querySelectorAll('*');
		for (const element of elements) {
			const attrs = element.attributes;
			for (let i = 0, l = attrs.length; i < l; i++) {
				const attr = attrs.item(i);
				if (attr && /data-bg[ebt](?:-.+)?/i.test(attr.name)) {
					element.removeAttribute(attr.name);
				}
			}
		}
		str = d.innerHTML;
	}
	return str as T;
}
