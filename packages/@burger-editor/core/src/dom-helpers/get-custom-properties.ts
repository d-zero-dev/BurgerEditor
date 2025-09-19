import type { ContainerType } from '../block/types.js';

import {
	BLOCK_OPTION_CSS_CUSTOM_PROPERTY_PREFIX,
	BLOCK_OPTION_SCOPE_SELECTOR,
} from '../const.js';

type CustomPropertyCategories = Map<string, CustomPropertyCategory>;

type CustomPropertyCategory = {
	readonly id: string;
	readonly name: string;
	readonly properties: CustomPropertyMap;
};

type CustomPropertyMap = Map<string, CustomProperty>;

type CustomProperty = {
	value: string;
	isDefault: boolean;
};

/**
 * Get all custom properties from document
 * @param scope
 * @param containerType
 */
export function getCustomProperties(
	scope: Document,
	containerType?: ContainerType,
): CustomPropertyCategories {
	const categories: CustomPropertyCategories = new Map();
	const defaultValues = new Map<string, string>();

	searchCustomProperty(scope, (cssProperty, value) => {
		if (!cssProperty.startsWith(BLOCK_OPTION_CSS_CUSTOM_PROPERTY_PREFIX)) {
			return;
		}

		const [propName, key] = cssProperty
			.slice(BLOCK_OPTION_CSS_CUSTOM_PROPERTY_PREFIX.length)
			.split('--');
		if (!propName) {
			return;
		}

		if (propName.startsWith('_') && !propName.startsWith(`_${containerType}_`)) {
			return;
		}

		const currentMap = categories.get(propName) ?? {
			id: propName,
			name: propName.replaceAll(/^_[a-z]+_/g, ''),
			properties: new Map(),
		};

		if (key) {
			currentMap.properties.set(key, { value, isDefault: false });
		} else {
			defaultValues.set(propName, value);
		}

		categories.set(propName, currentMap);
	});

	for (const propList of categories.values()) {
		for (const [key, customProperty] of propList.properties.entries()) {
			if (customProperty.value.trim().toLowerCase() === 'null') {
				propList.properties.delete(key);
			}
		}
	}

	for (const [category, value] of defaultValues.entries()) {
		const currentMap = categories.get(category);

		if (!currentMap) {
			continue;
		}

		for (const [key, customProperty] of currentMap.properties.entries()) {
			if (
				value === `var(${BLOCK_OPTION_CSS_CUSTOM_PROPERTY_PREFIX}${category}--${key})`
			) {
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

	const CSSLayerBlockRule = scope.defaultView?.CSSLayerBlockRule;
	if (CSSLayerBlockRule === undefined) {
		throw new Error('CSSLayerBlockRule is not available');
	}

	const styleRules: CSSStyleRule[] = [];

	for (const rule of rules) {
		if (rule instanceof CSSStyleRule && rule.selectorText) {
			styleRules.push(...getStyleRules(rule.cssRules, scope), rule);
			continue;
		}

		if (rule instanceof CSSLayerBlockRule) {
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
				const selector = cssRule.selectorText.trim().replace(/^&/, '').trim();
				if (selector === BLOCK_OPTION_SCOPE_SELECTOR) {
					for (const cssProperty of cssRule.style) {
						if (!cssProperty.startsWith('--')) {
							continue;
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
