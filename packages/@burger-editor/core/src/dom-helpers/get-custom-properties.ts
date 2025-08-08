import { BLOCK_OPTION_CSS_CUSTOM_PROPERTY_PREFIX } from '../const.js';

type CustomPropertyCategories = Map<string, Map<string, CustomProperty>>;

type CustomPropertyMap = Map<string, CustomProperty>;

type CustomProperty = {
	value: string;
	isDefault: boolean;
};

/**
 * Get all custom properties from document
 * @param scope
 */
export function getCustomProperties(scope: Document): CustomPropertyCategories {
	const categories: CustomPropertyCategories = new Map();
	const defaultValues = new Map<string, string>();

	searchCustomProperty(scope, (cssProperty, value) => {
		if (!cssProperty.startsWith(BLOCK_OPTION_CSS_CUSTOM_PROPERTY_PREFIX)) {
			return;
		}

		const [type, key] = cssProperty
			.slice(BLOCK_OPTION_CSS_CUSTOM_PROPERTY_PREFIX.length)
			.split('-');
		if (!type) {
			return;
		}

		const currentMap: CustomPropertyMap = categories.get(type) ?? new Map();

		if (key) {
			currentMap.set(key, { value, isDefault: false });
		} else {
			defaultValues.set(type, value);
		}

		categories.set(type, currentMap);
	});

	for (const propList of categories.values()) {
		for (const [key, customProperty] of propList.entries()) {
			if (customProperty.value.trim().toLowerCase() === 'null') {
				propList.delete(key);
			}
		}
	}

	for (const [category, value] of defaultValues.entries()) {
		const currentMap = categories.get(category);

		if (!currentMap) {
			continue;
		}

		for (const [key, customProperty] of currentMap.entries()) {
			if (value === `var(${BLOCK_OPTION_CSS_CUSTOM_PROPERTY_PREFIX}${category}-${key})`) {
				customProperty.isDefault = true;
			}
		}
	}

	return categories;
}

/**
 *
 * @param scope
 * @param property
 */
export function getCustomProperty(
	scope: Document,
	property: string | RegExp,
): string | null {
	let result: string | null = null;

	searchCustomProperty(scope, (cssProperty, value) => {
		if (property instanceof RegExp) {
			if (property.test(cssProperty)) {
				result = value;
				return;
			}
		} else {
			if (cssProperty === property) {
				result = value;
				return;
			}
		}
	});

	return result;
}

/**
 * Get all CSSStyleRule from CSSRule array recursively
 * @param rules - CSSRule array
 * @param scope - Document
 * @returns CSSStyleRule array
 */
function getStyleRules(rules: CSSRuleList, scope: Document): readonly CSSStyleRule[] {
	const CSSStyleRule = scope.defaultView?.CSSStyleRule;
	if (CSSStyleRule === undefined) {
		throw new Error('CSSStyleRule is not available');
	}

	const CSSGroupingRule = scope.defaultView?.CSSGroupingRule;
	if (CSSGroupingRule === undefined) {
		throw new Error('CSSGroupingRule is not available');
	}

	const styleRules: CSSStyleRule[] = [];

	for (const rule of rules) {
		if (rule instanceof CSSStyleRule) {
			styleRules.push(rule);
			continue;
		}

		if (rule instanceof CSSGroupingRule) {
			styleRules.push(...getStyleRules(rule.cssRules, scope));
			continue;
		}
	}

	return styleRules;
}

/**
 *
 * @param scope
 * @param found
 */
function searchCustomProperty(
	scope: Document,
	found: (property: string, value: string) => void,
) {
	for (const styleSheet of scope.styleSheets) {
		try {
			const styleRules = getStyleRules(styleSheet.cssRules, scope);
			for (const cssRule of styleRules) {
				if (cssRule.selectorText === ':root') {
					for (const cssProperty of cssRule.style) {
						if (!cssProperty.startsWith('--')) {
							return;
						}
						const value = cssRule.style.getPropertyValue(cssProperty);

						found(cssProperty, value);
					}
				}
			}
		} catch (error) {
			if (error instanceof Error && error.name === 'SecurityError') {
				continue;
			}
			throw error;
		}
	}
}
