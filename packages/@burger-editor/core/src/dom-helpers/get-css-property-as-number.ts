const getCSSPropertyAsNumberCache = new Map<string, number>();

/**
 *
 * @param el
 * @param property
 */
export function getCSSPropertyAsNumber(el: HTMLElement, property: string): number {
	const value = window.getComputedStyle(el).getPropertyValue(property);
	if (value === '') {
		return 0;
	}

	const cached = getCSSPropertyAsNumberCache.get(value);
	if (cached !== undefined) {
		return cached;
	}

	const i_or_nan = Number.parseInt(value, 10);
	const result = Number.isNaN(i_or_nan) ? 0 : i_or_nan;

	getCSSPropertyAsNumberCache.set(value, result);

	return result;
}
