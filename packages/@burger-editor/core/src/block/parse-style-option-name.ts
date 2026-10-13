import { BLOCK_OPTION_CSS_CUSTOM_PROPERTY_PREFIX } from '../const.js';

/**
 * Split a style option custom property name into its category and key.
 *
 * `--bge-options-{category}` (the selected-value declaration) yields
 * `key: null`; `--bge-options-{category}--{key}` (a choice) yields both.
 * Option detection and the read-back of saved HTML both split through this
 * function, so a name is offered as a choice exactly when it can be read
 * back. Names that cannot be split unambiguously return `null`: an empty
 * category or key, or more than one `--` after the prefix. Characters are
 * otherwise not restricted.
 * @param property - Custom property name, including the leading `--`
 * @returns The category and key, or `null` when `property` is not a style
 * option name
 */
export function parseStyleOptionName(
	property: string,
): { readonly category: string; readonly key: string | null } | null {
	if (!property.startsWith(BLOCK_OPTION_CSS_CUSTOM_PROPERTY_PREFIX)) {
		return null;
	}
	const segments = property
		.slice(BLOCK_OPTION_CSS_CUSTOM_PROPERTY_PREFIX.length)
		.split('--');
	const [category, key] = segments;
	if (!category || segments.length > 2 || key === '') {
		return null;
	}
	return { category, key: key ?? null };
}
