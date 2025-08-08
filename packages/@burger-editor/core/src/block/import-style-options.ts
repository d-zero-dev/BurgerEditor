/**
 *
 * @param el
 * @param style
 */
export function importStyleOptions(el: HTMLElement, style: Record<string, string>) {
	for (const [key, value] of Object.entries(style)) {
		if (value === '@@default') {
			continue;
		}
		const name = `--bge-options-${key}`;
		const variable = `var(${name}-${value})`;
		el.style.setProperty(name, variable);
	}
}
