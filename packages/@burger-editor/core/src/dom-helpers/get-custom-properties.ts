import type { ContainerType } from '../block/types.js';

import {
	BLOCK_OPTION_CSS_CUSTOM_PROPERTY_PREFIX,
	BLOCK_OPTION_SCOPE_SELECTOR,
} from '../const.js';
import { comparePriority } from '../utils/compare-priority.js';

type CustomPropertyCategories = Map<string, CustomPropertyCategory>;

type CustomPropertyCategory = {
	readonly id: string;
	readonly name: string;
	readonly properties: CustomPropertyMap;
};

type CustomPropertyMap = Map<string, CustomProperty>;

type CustomProperty = {
	value: string;
	priority: readonly number[];
	isDefault: boolean;
};

interface CSSRuleWithLayerPriority {
	readonly rule: CSSStyleRule;
	readonly _cssText: string;
	readonly layers: readonly LayerPriority[];
}

interface LayerPriority {
	readonly priorityList: readonly string[];
	readonly layerName: string | null;
	readonly priority: number;
}

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

	searchCustomProperty(scope, (cssProperty, value, layers) => {
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
			properties: new Map() as CustomPropertyMap,
		};

		if (key) {
			const newProperty: CustomProperty = {
				value,
				isDefault: false,
				priority: layers.map((layer) => layer.priority),
			};

			const currentProperty = currentMap.properties.get(key);

			currentMap.properties.set(
				key,
				currentProperty
					? compareCustomPropertyByLayerPriority(currentProperty, newProperty)
					: newProperty,
			);
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
 * @param layers
 * @param scope - Document
 * @returns CSSStyleRule array
 */
function getStyleRules(
	rules: CSSRuleList,
	layers: readonly LayerPriority[],
	scope: Document,
): readonly CSSRuleWithLayerPriority[] {
	const CSSStyleRule = scope.defaultView?.CSSStyleRule;
	if (CSSStyleRule === undefined) {
		throw new Error('CSSStyleRule is not available');
	}

	const CSSLayerBlockRule = scope.defaultView?.CSSLayerBlockRule;
	if (CSSLayerBlockRule === undefined) {
		throw new Error('CSSLayerBlockRule is not available');
	}

	const CSSLayerStatementRule = scope.defaultView?.CSSLayerStatementRule;
	if (CSSLayerStatementRule === undefined) {
		throw new Error('CSSLayerStatementRule is not available');
	}

	const layerPriorities = [...rules].filter(
		(rule) => rule instanceof CSSLayerStatementRule,
	);

	const styleRules: CSSRuleWithLayerPriority[] = [];

	for (const rule of rules) {
		if (rule instanceof CSSStyleRule) {
			styleRules.push(
				{
					rule,
					_cssText: rule.cssText,
					layers,
				},
				...getStyleRules(rule.cssRules, layers, scope),
			);
		}

		if (rule instanceof CSSLayerBlockRule) {
			const layerName = rule.name;
			const foundPriorityLayerList = layerPriorities.find((priority) =>
				priority.nameList.includes(layerName),
			);

			const priority =
				foundPriorityLayerList?.nameList.toReversed().indexOf(layerName) ?? 0;

			styleRules.push(
				...getStyleRules(
					rule.cssRules,
					[
						...layers,
						{
							priorityList: foundPriorityLayerList?.nameList ?? [],
							layerName,
							priority: 1 + priority,
						},
					],
					scope,
				),
			);
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
	found: (property: string, value: string, layers: readonly LayerPriority[]) => void,
) {
	for (const styleSheet of scope.styleSheets) {
		try {
			const styleRules = getStyleRules(styleSheet.cssRules, [], scope);

			for (const cssRule of styleRules) {
				const selector = cssRule.rule.selectorText.trim().replace(/^&/, '').trim();
				if (selector === BLOCK_OPTION_SCOPE_SELECTOR) {
					for (const cssProperty of cssRule.rule.style) {
						if (!cssProperty.startsWith('--')) {
							continue;
						}
						const value = cssRule.rule.style.getPropertyValue(cssProperty);
						found(cssProperty, value, cssRule.layers);
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

/**
 * Compare custom property by layer priority
 *
 * - レイヤーの数が少ないほど優先度が高い
 * - レイヤーの数が同じ場合は、レイヤーの優先度の値が小さいほど優先度が高い
 * - 全てのレイヤーの優先度が同じ場合は、bを返す
 * @param a
 * @param b
 */
function compareCustomPropertyByLayerPriority(
	a: CustomProperty,
	b: CustomProperty,
): CustomProperty {
	const result = comparePriority(a.priority, b.priority);
	if (result === 0) {
		return b;
	}
	if (result === -1) {
		return b;
	}
	if (result === 1) {
		return a;
	}
	return b;
}
