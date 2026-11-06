import type { ItemSeed } from '@burger-editor/core';

import { items as defaultItems } from '@burger-editor/blocks';

/**
 * The hooks of an item definition that the agent writes run: `normalizeItemData`
 * (what is saved) and `validateItemData` (whether it may be saved).
 * @example
 * ```ts
 * const hooks: WriteHooks = { validateItemData: () => [] };
 * ```
 */
export type WriteHooks = Pick<
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	ItemSeed<string, any, any>,
	'normalizeItemData' | 'validateItemData'
>;

/**
 * The item definition for a `[data-bgi]` wrapper, or `undefined` for an item
 * the standard items (`@burger-editor/blocks`) do not define.
 *
 * Why not the project's own items: the cli has no way to load a project's item
 * definitions, so a project-specific item is written without normalization or
 * validation.
 *
 * Kept apart from `import-item-data.ts` so that `block-builder.ts` can check the
 * items it renders without importing a module that imports it back.
 * @param wrapper - The `[data-bgi]` element
 * @example
 * ```ts
 * const seed = seedOf(wrapper); // the standard `image` definition for data-bgi="image"
 * ```
 */
export function seedOf(wrapper: HTMLElement): WriteHooks | undefined {
	const name = wrapper.dataset.bgi ?? '';
	// Only the items' own keys: `data-bgi="constructor"` must not reach Object.prototype
	return Object.hasOwn(defaultItems, name)
		? ((defaultItems as Record<string, unknown>)[name] as WriteHooks)
		: undefined;
}
