/**
 *
 * @param el
 */
export function exportStyleOptions(el: HTMLElement): Record<string, string> {
	const style: Record<string, string> = {};
	for (const property of el.style) {
		if (!property.startsWith('--bge-options-')) {
			continue;
		}
		const category = property.replace('--bge-options-', '');
		const propValue = el.style.getPropertyValue(property);
		const [, _category, propName] =
			propValue.match(/^var\(--bge-options-([a-z]+)-([a-z]+(?:-[a-z]+)*)\)$/) ?? [];

		if (category !== _category || !propName) {
			continue;
		}

		style[category] = propName;
	}

	return style;
}
