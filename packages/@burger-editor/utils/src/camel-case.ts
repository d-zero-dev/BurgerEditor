const camelCaseCache = new Map<string, string>();

/**
 *
 * @param str
 */
export function camelCase(str: string): string {
	if (camelCaseCache.has(str)) {
		return camelCaseCache.get(str)!;
	}
	const result = str.replaceAll(/-([a-z])/g, (_, c) => c.toUpperCase());
	camelCaseCache.set(str, result);
	return result;
}
