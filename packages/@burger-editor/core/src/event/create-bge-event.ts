import type { BurgerEditorEventMap } from '../types.js';

export type BurgerEditorEvent<T extends keyof BurgerEditorEventMap> = CustomEvent<
	BurgerEditorEventMap[T]
>;

/**
 *
 * @param type
 * @param eventData
 */
export function createBgeEvent<T extends keyof BurgerEditorEventMap>(
	type: T,
	eventData: BurgerEditorEventMap[T],
): BurgerEditorEvent<T> {
	return new CustomEvent(type, { detail: eventData });
}
