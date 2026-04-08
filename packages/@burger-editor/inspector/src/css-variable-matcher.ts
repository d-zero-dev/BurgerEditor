export interface SearchParams {
	readonly category: string;
	readonly values: readonly string[];
	readonly originalQuery: string;
	readonly isWildcard: boolean;
}

/**
 * Parse search query string into structured parameters
 * Supports multiple formats:
 * - Simple: "margin=normal"
 * - Wildcard: "margin=*"
 * - OR values: "margin=normal,large"
 * @param query Search query string
 * @returns Parsed search parameters
 * @throws {Error} If query format is invalid
 * @example
 * parseSearchQuery("margin=normal")
 * // => { category: "margin", values: ["normal"], originalQuery: "margin=normal", isWildcard: false }
 *
 * parseSearchQuery("margin=*")
 * // => { category: "margin", values: ["*"], originalQuery: "margin=*", isWildcard: true }
 *
 * parseSearchQuery("margin=normal,large")
 * // => { category: "margin", values: ["normal", "large"], originalQuery: "margin=normal,large", isWildcard: false }
 */
export function parseSearchQuery(query: string): SearchParams {
	// Expected format: "{category}={value1,value2,...}" or "{category}=*"
	const match = query.match(/^([^=]+)=(.+)$/);

	if (!match) {
		throw new Error(
			`Invalid query format: "${query}". Expected format: "{category}={value}" (e.g., "margin=normal")`,
		);
	}

	const category = match[1]!.trim();
	const valueString = match[2]!.trim();

	// Check for wildcard
	if (valueString === '*') {
		return {
			category,
			values: ['*'],
			originalQuery: query,
			isWildcard: true,
		};
	}

	// Split by comma for OR values
	const values = valueString.split(',').map((v) => v.trim());

	return {
		category,
		values,
		originalQuery: query,
		isWildcard: false,
	};
}

/**
 * Check if style options match the search query
 * Uses object matching instead of regex patterns
 * @param styleOptions Style options extracted from element (e.g., { margin: "normal", "bg-color": "blue" })
 * @param searchParams Search parameters
 * @returns true if matches, false otherwise
 * @example
 * matchesSearchQuery({ margin: "normal" }, { category: "margin", values: ["normal"], isWildcard: false })
 * // => true
 *
 * matchesSearchQuery({ margin: "large" }, { category: "margin", values: ["*"], isWildcard: true })
 * // => true
 *
 * matchesSearchQuery({ margin: "normal" }, { category: "margin", values: ["normal", "large"], isWildcard: false })
 * // => true (OR condition)
 */
export function matchesSearchQuery(
	styleOptions: Record<string, string>,
	searchParams: SearchParams,
): boolean {
	const { category, values, isWildcard } = searchParams;

	// Check if this category exists in style options
	const actualValue = styleOptions[category];
	if (actualValue === undefined) {
		return false;
	}

	// Wildcard matches any value
	if (isWildcard) {
		return true;
	}

	// Check if actual value is in the list of allowed values (OR condition)
	return values.includes(actualValue);
}
