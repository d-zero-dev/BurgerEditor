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
	readonly layers: readonly LayerPriority[];
}

interface LayerPriority {
	/** Layer declaration order list (diagnostic — not consumed by priority logic) */
	readonly priorityList: readonly string[];
	/** Layer name (diagnostic — not consumed by priority logic) */
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
	const defaultValues = new Map<string, CustomProperty>();

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
			name: propName.replace(/^_[a-z]+_/, ''),
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

			categories.set(propName, currentMap);
		} else {
			const newDefaultValue: CustomProperty = {
				value,
				isDefault: true,
				priority: layers.map((layer) => layer.priority),
			};

			const currentDefaultValue = defaultValues.get(propName);

			defaultValues.set(
				propName,
				currentDefaultValue
					? compareCustomPropertyByLayerPriority(currentDefaultValue, newDefaultValue)
					: newDefaultValue,
			);
		}
	});

	for (const propList of categories.values()) {
		for (const [key, customProperty] of propList.properties.entries()) {
			if (customProperty.value.trim().toLowerCase() === 'null') {
				propList.properties.delete(key);
			}
		}
	}

	for (const [category, property] of defaultValues.entries()) {
		const currentMap = categories.get(category);

		if (!currentMap) {
			continue;
		}

		for (const [key, customProperty] of currentMap.properties.entries()) {
			if (
				property.value.trim() ===
				`var(${BLOCK_OPTION_CSS_CUSTOM_PROPERTY_PREFIX}${category}--${key})`
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
	let resultValue: string | null = null;
	let resultPriority: readonly number[] = [];

	searchCustomProperty(scope, (cssProperty, value, layers) => {
		const matches =
			property instanceof RegExp ? property.test(cssProperty) : cssProperty === property;
		if (!matches) {
			return;
		}

		const newPriority = layers.map((l) => l.priority);
		if (resultValue == null || comparePriority(resultPriority, newPriority) <= 0) {
			resultValue = value;
			resultPriority = newPriority;
		}
	});

	return resultValue;
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

	const CSSScopeRule = scope.defaultView?.CSSScopeRule;

	// Build unified layer order from CSSLayerStatementRules and CSSLayerBlockRules (first-occurrence order per CSS spec)
	// Pass 1: Collect layers declared in @layer statements (explicit order takes precedence)
	const allLayerNames: string[] = [];
	for (const rule of rules) {
		if (rule instanceof CSSLayerStatementRule) {
			for (const name of rule.nameList) {
				if (!allLayerNames.includes(name)) {
					allLayerNames.push(name);
				}
			}
		}
	}
	// Pass 2: Append layers that appear only in @layer block rules (first-occurrence after statements)
	for (const rule of rules) {
		if (rule instanceof CSSLayerBlockRule && !allLayerNames.includes(rule.name)) {
			allLayerNames.push(rule.name);
		}
	}
	const reversedLayerNames = allLayerNames.toReversed();

	const styleRules: CSSRuleWithLayerPriority[] = [];

	for (const rule of rules) {
		if (rule instanceof CSSStyleRule) {
			styleRules.push(
				{
					rule,
					layers,
				},
				...getStyleRules(rule.cssRules, layers, scope),
			);
		}

		if (rule instanceof CSSLayerBlockRule) {
			const layerName = rule.name;
			const reversedIndex = reversedLayerNames.indexOf(layerName);
			const priority = Math.max(reversedIndex, 0);

			styleRules.push(
				...getStyleRules(
					rule.cssRules,
					[
						...layers,
						{
							priorityList: allLayerNames,
							layerName,
							priority: 1 + priority,
						},
					],
					scope,
				),
			);
		}

		if (CSSScopeRule && rule instanceof CSSScopeRule) {
			styleRules.push(...getStyleRules(rule.cssRules, layers, scope));
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
	if (result === 1) {
		return a;
	}
	return b;
}
