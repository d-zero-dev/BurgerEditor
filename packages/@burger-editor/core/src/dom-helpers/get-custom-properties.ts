import type { EditableArea } from '../editable-area.js';

const PREFIX = '--bge-options-';

type CustomPropertyCategories = Map<string, Map<string, CustomProperty>>;

type CustomPropertyMap = Map<string, CustomProperty>;

type CustomProperty = {
	value: string;
	isDefault: boolean;
};

/**
 *
 * @param editorArea
 */
export function getCustomProperties(editorArea: EditableArea): CustomPropertyCategories {
	const categories: CustomPropertyCategories = new Map();
	const defaultValues = new Map<string, string>();

	// From iframe scope
	const CSSStyleRule =
		editorArea.containerElement.ownerDocument.defaultView?.CSSStyleRule;
	if (CSSStyleRule === undefined) {
		throw new Error('CSSStyleRule is not available');
	}

	for (const styleSheet of editorArea.containerElement.ownerDocument.styleSheets) {
		try {
			for (const cssRule of styleSheet.cssRules) {
				if (cssRule instanceof CSSStyleRule && cssRule.selectorText === ':root') {
					for (const cssProperty of cssRule.style) {
						if (cssProperty.startsWith(PREFIX)) {
							const [type, key] = cssProperty.slice(PREFIX.length).split('-');
							if (!type) {
								continue;
							}

							const currentMap: CustomPropertyMap = categories.get(type) ?? new Map();

							if (key) {
								const value = cssRule.style.getPropertyValue(cssProperty);
								currentMap.set(key, { value, isDefault: false });
							} else {
								const value = cssRule.style.getPropertyValue(cssProperty);
								defaultValues.set(type, value);
							}

							categories.set(type, currentMap);
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

	for (const [category, value] of defaultValues.entries()) {
		const currentMap = categories.get(category);

		if (!currentMap) {
			continue;
		}

		for (const [key, customProperty] of currentMap.entries()) {
			if (value === `var(--bge-options-${category}-${key})`) {
				customProperty.isDefault = true;
			}
		}
	}

	return categories;
}
