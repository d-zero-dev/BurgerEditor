import combinateSoundMarks from 'jaco/combineSoundMarks';

/**
 *
 * @param datum
 */
export function valueFilter<T>(datum: T): T {
	if (typeof datum !== 'string') {
		return datum;
	}
	let str: string = datum;

	str = combinateSoundMarks(str);

	// Remove data-bgb/data-bgi/data-bge-* attributes
	if (str.trim().startsWith('<')) {
		// Not `document.createElement`: this runs before the sanitizer sees the string, and an
		// `<img onerror>` parsed in the live document loads and fires. An inert one loads nothing
		const d = document.implementation.createHTMLDocument('').createElement('div');
		d.innerHTML = str;
		const elements = d.querySelectorAll('*');
		for (const element of elements) {
			// `attributes` is live: removing while walking it would skip the attribute after each removal
			const markers = [...element.attributes].filter((attr) =>
				/data-bg[ebt](?:-.+)?/i.test(attr.name),
			);
			for (const attr of markers) {
				element.removeAttribute(attr.name);
			}
		}
		str = d.innerHTML;
	}
	return str as T;
}
