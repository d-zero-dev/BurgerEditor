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
	readonly scopeRoot: string | null;
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

	// Filter out disabled properties declared with empty value (e.g. `--prop: ;`)
	// CSSOM getPropertyValue() returns ' ' for `--prop: ;`, which becomes '' after trim().
	// Note: `--prop:;` (no space) is dropped by current browsers (parse error).
	// @see https://drafts.csswg.org/css-variables-2/#defining-variables
	// @see https://github.com/w3c/csswg-drafts/issues/774
	for (const propList of categories.values()) {
		for (const [key, customProperty] of propList.properties.entries()) {
			if (customProperty.value.trim() === '') {
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
 * Collect the global top-level layer order across all stylesheets in the document.
 *
 * CSS cascade layers are ordered globally across the entire document, not per-stylesheet.
 * This function mirrors the browser's layer ordering algorithm:
 * - Pass 1: Collect layers declared in `@layer` statement rules (first-occurrence wins)
 * - Pass 2: Append layers that appear only in `@layer` block rules
 *
 * Cross-origin stylesheets that throw `SecurityError` are silently skipped.
 * @see {@link https://www.w3.org/TR/css-cascade-5/#layer-ordering CSS Cascading and Inheritance Level 5 §6.4.3 Layer Ordering}
 * > "Cascade layers are sorted by the order in which they first are declared,
 * > with nested layers grouped within their parent layers before any unlayered rules."
 * @see {@link https://www.w3.org/TR/css-cascade-5/#layer-empty CSS Cascading and Inheritance Level 5 §6.4.4.2 Declaring Without Styles}
 * @param scope - Document to scan
 * @returns Ordered array of top-level layer names
 */
function collectGlobalTopLevelLayerOrder(scope: Document): readonly string[] {
	const CSSLayerStatementRule = scope.defaultView?.CSSLayerStatementRule;
	const CSSLayerBlockRule = scope.defaultView?.CSSLayerBlockRule;

	if (CSSLayerStatementRule === undefined || CSSLayerBlockRule === undefined) {
		return [];
	}

	const allLayerNames: string[] = [];

	// Pass 1: Collect layers declared in @layer statements (explicit order takes precedence)
	for (const styleSheet of scope.styleSheets) {
		try {
			for (const rule of styleSheet.cssRules) {
				if (rule instanceof CSSLayerStatementRule) {
					for (const name of rule.nameList) {
						if (!allLayerNames.includes(name)) {
							allLayerNames.push(name);
						}
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

	// Pass 2: Append layers that appear only in @layer block rules (first-occurrence after statements)
	for (const styleSheet of scope.styleSheets) {
		try {
			for (const rule of styleSheet.cssRules) {
				if (rule instanceof CSSLayerBlockRule && !allLayerNames.includes(rule.name)) {
					allLayerNames.push(rule.name);
				}
			}
		} catch (error) {
			if (error instanceof Error && error.name === 'SecurityError') {
				continue;
			}
			throw error;
		}
	}

	return allLayerNames;
}

/**
 * Get all CSSStyleRule from CSSRule array recursively
 * @param rules - CSSRule array
 * @param layers
 * @param scope - Document
 * @param scopeRoot
 * @param topLevelLayerOrder - Global layer order from collectGlobalTopLevelLayerOrder (top-level calls only)
 * @returns CSSStyleRule array
 */
function getStyleRules(
	rules: CSSRuleList,
	layers: readonly LayerPriority[],
	scope: Document,
	scopeRoot: string | null = null,
	topLevelLayerOrder?: readonly string[],
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

	// Build unified layer order:
	// - When topLevelLayerOrder is provided (top-level call), use it as the base and append any local-only names
	// - When not provided (recursive call for nested layers), compute locally from this rule list
	const allLayerNames: string[] = topLevelLayerOrder ? [...topLevelLayerOrder] : [];
	if (!topLevelLayerOrder) {
		// Pass 1: Collect layers declared in @layer statements (explicit order takes precedence)
		for (const rule of rules) {
			if (rule instanceof CSSLayerStatementRule) {
				for (const name of rule.nameList) {
					if (!allLayerNames.includes(name)) {
						allLayerNames.push(name);
					}
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
					scopeRoot,
				},
				...getStyleRules(rule.cssRules, layers, scope, scopeRoot),
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
					scopeRoot,
				),
			);
		}

		if (CSSScopeRule && rule instanceof CSSScopeRule) {
			const start = 'start' in rule && typeof rule.start === 'string' ? rule.start : null;
			styleRules.push(...getStyleRules(rule.cssRules, layers, scope, start));
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
	const globalLayerOrder = collectGlobalTopLevelLayerOrder(scope);

	for (const styleSheet of scope.styleSheets) {
		try {
			const styleRules = getStyleRules(
				styleSheet.cssRules,
				[],
				scope,
				null,
				globalLayerOrder,
			);

			for (const cssRule of styleRules) {
				const selector = cssRule.rule.selectorText.trim().replace(/^&/, '').trim();
				if (
					selector === BLOCK_OPTION_SCOPE_SELECTOR ||
					(selector === ':scope' && cssRule.scopeRoot === BLOCK_OPTION_SCOPE_SELECTOR)
				) {
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
 * Get repeat-min-inline-size variant definitions from document
 * @param scope
 */
export function getRepeatMinInlineSizeVariants(
	scope: Document,
): CustomPropertyCategory | null {
	const PREFIX = '--bge-repeat-min-inline-size';
	const properties: CustomPropertyMap = new Map();
	const baseRef: { value: string | null; priority: readonly number[] } = {
		value: null,
		priority: [],
	};

	searchCustomProperty(scope, (cssProperty, value, layers) => {
		if (cssProperty === PREFIX) {
			const newPriority = layers.map((l) => l.priority);
			if (!baseRef.value || comparePriority(baseRef.priority, newPriority) <= 0) {
				baseRef.value = value;
				baseRef.priority = newPriority;
			}
		} else if (cssProperty.startsWith(PREFIX + '--')) {
			const key = cssProperty.slice((PREFIX + '--').length);
			const newProperty: CustomProperty = {
				value,
				priority: layers.map((l) => l.priority),
				isDefault: false,
			};
			const existing = properties.get(key);
			properties.set(
				key,
				existing
					? compareCustomPropertyByLayerPriority(existing, newProperty)
					: newProperty,
			);
		}
	});

	if (properties.size === 0) return null;

	// デフォルト判定: var(--bge-repeat-min-inline-size--{key}) を参照しているか
	if (baseRef.value) {
		const match = baseRef.value.match(/--bge-repeat-min-inline-size--([^)]+)/);
		const defaultKey = match?.[1]?.trim();
		if (defaultKey) {
			const prop = properties.get(defaultKey);
			if (prop) {
				properties.set(defaultKey, { ...prop, isDefault: true });
			}
		}
	}

	return { id: 'repeat-min-inline-size', name: 'repeat-min-inline-size', properties };
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
