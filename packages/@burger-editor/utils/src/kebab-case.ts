const kebabCaseCache = new Map<string, string>();

/**
 *
 * @param str
 */
export function kebabCase(str: string): string {
	if (kebabCaseCache.has(str)) {
		return kebabCaseCache.get(str)!;
	}
	const result = str.replaceAll(/([A-Z])/g, '-$1').toLowerCase();
	kebabCaseCache.set(str, result);
	return result;
}
