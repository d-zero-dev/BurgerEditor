export const CSS_LAYER = {
	base: 'bge-component-bases',
	components: 'bge-components',
	ui: 'bge-ui',
} as const;

export const BLOCK_OPTION_CSS_CUSTOM_PROPERTY_PREFIX = '--bge-options-';

export const BLOCK_OPTION_SCOPE_SELECTOR = `[data-bge-container]`;

/**
 * Stand-in for an empty custom property value (`--x: ;`).
 *
 * Browsers keep such a declaration with the value `' '`, and project CSS
 * relies on it to hide a built-in style option, but jsdom drops it while
 * parsing, so a lower-priority declaration of the same property would win
 * instead. Code that loads CSS into jsdom (file-io's
 * `createStylesheetDocument()`) writes this value in its place, and
 * `getCustomProperties` treats it the same as an empty value.
 * @example
 * ```ts
 * const css = '[data-bge-container] { --bge-options-margin--none: ; }'.replace(
 * 	': ;',
 * 	`: ${EMPTY_CUSTOM_PROPERTY_VALUE};`,
 * );
 * ```
 */
export const EMPTY_CUSTOM_PROPERTY_VALUE = '--bge-empty-custom-property-value';
