import type { BurgerBlock } from '../block/block.js';
import type { Item } from '../item/item.js';
import type { ItemData } from '../item/types.js';

import { test, expect, describe, vi } from 'vitest';

import { UIStateStore } from './ui-state.js';

describe('UIStateStore', () => {
	test('initial state has no open dialog', () => {
		const store = new UIStateStore();
		expect(store.getSnapshot().openDialog).toBeNull();
	});

	test('open transitions replace the snapshot object', () => {
		const store = new UIStateStore();
		const before = store.getSnapshot();

		store.openBlockCatalog();

		const after = store.getSnapshot();
		expect(after).not.toBe(before);
		expect(after.openDialog).toEqual({ type: 'block-catalog' });

		const block = { name: 'dummy-block' } as unknown as BurgerBlock;
		store.openBlockOptions(block);
		expect(store.getSnapshot().openDialog).toEqual({ type: 'block-options', block });
	});

	test('openItemEditor carries the item', () => {
		const store = new UIStateStore();
		const item = { name: 'dummy' } as unknown as Item<ItemData, {}>;

		store.openItemEditor(item);

		expect(store.getSnapshot().openDialog).toEqual({ type: 'item-editor', item });
	});

	test('closeDialog is a no-op when nothing is open', () => {
		const store = new UIStateStore();
		const listener = vi.fn();
		store.subscribe(listener);

		store.closeDialog();

		expect(listener).not.toHaveBeenCalled();
	});

	test('subscribe notifies on every transition and unsubscribes cleanly', () => {
		const store = new UIStateStore();
		const listener = vi.fn();
		const unsubscribe = store.subscribe(listener);

		store.openBlockCatalog();
		store.closeDialog();
		expect(listener).toHaveBeenCalledTimes(2);

		unsubscribe();
		store.openBlockCatalog();
		expect(listener).toHaveBeenCalledTimes(2);
	});
});
