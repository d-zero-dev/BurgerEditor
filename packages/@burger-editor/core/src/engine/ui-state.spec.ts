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

	test('initial state is not processing and both areas are in visual mode', () => {
		const store = new UIStateStore();
		expect(store.getSnapshot().processing).toBe(false);
		expect(store.getSnapshot().sourceMode).toEqual({ main: false, draft: false });
	});

	test('setProcessing replaces the snapshot and is a no-op on the same value', () => {
		const store = new UIStateStore();
		const listener = vi.fn();
		store.subscribe(listener);

		store.setProcessing(true);
		expect(store.getSnapshot().processing).toBe(true);
		expect(listener).toHaveBeenCalledTimes(1);

		store.setProcessing(true);
		expect(listener).toHaveBeenCalledTimes(1);

		store.setProcessing(false);
		expect(store.getSnapshot().processing).toBe(false);
		expect(listener).toHaveBeenCalledTimes(2);
	});

	test('setSourceMode only changes the given area and keeps other state', () => {
		const store = new UIStateStore();
		store.openBlockCatalog();

		store.setSourceMode('draft', true);

		const state = store.getSnapshot();
		expect(state.sourceMode).toEqual({ main: false, draft: true });
		expect(state.openDialog).toEqual({ type: 'block-catalog' });
	});

	test('setSourceMode is a no-op on the same value', () => {
		const store = new UIStateStore();
		const listener = vi.fn();
		store.subscribe(listener);

		store.setSourceMode('main', false);

		expect(listener).not.toHaveBeenCalled();
	});

	test('toggleSourceMode flips the given area back and forth', () => {
		const store = new UIStateStore();

		store.toggleSourceMode('main');
		expect(store.getSnapshot().sourceMode.main).toBe(true);

		store.toggleSourceMode('main');
		expect(store.getSnapshot().sourceMode.main).toBe(false);
	});

	test('initial state shows main with no selected block', () => {
		const store = new UIStateStore();
		expect(store.getSnapshot().activeArea).toBe('main');
		expect(store.getSnapshot().currentBlock).toBeNull();
	});

	test('setActiveArea replaces the snapshot and is a no-op on the same value', () => {
		const store = new UIStateStore();
		const listener = vi.fn();
		store.subscribe(listener);

		store.setActiveArea('draft');
		expect(store.getSnapshot().activeArea).toBe('draft');
		expect(listener).toHaveBeenCalledTimes(1);

		store.setActiveArea('draft');
		expect(listener).toHaveBeenCalledTimes(1);
	});

	test('setCurrentBlock replaces the snapshot and is a no-op for the same block', () => {
		const store = new UIStateStore();
		const listener = vi.fn();
		store.subscribe(listener);

		const blockA = { is: (other: unknown) => other === blockA } as unknown as BurgerBlock;
		const blockB = { is: (other: unknown) => other === blockB } as unknown as BurgerBlock;

		store.setCurrentBlock(blockA);
		expect(store.getSnapshot().currentBlock).toBe(blockA);
		expect(listener).toHaveBeenCalledTimes(1);

		// same block instance again → no-op
		store.setCurrentBlock(blockA);
		expect(listener).toHaveBeenCalledTimes(1);

		store.setCurrentBlock(blockB);
		expect(store.getSnapshot().currentBlock).toBe(blockB);
		expect(listener).toHaveBeenCalledTimes(2);

		store.setCurrentBlock(null);
		expect(store.getSnapshot().currentBlock).toBeNull();
		expect(listener).toHaveBeenCalledTimes(3);

		store.setCurrentBlock(null);
		expect(listener).toHaveBeenCalledTimes(3);
	});

	test('subscribe and getSnapshot are stable across calls (safe to pass directly to useSyncExternalStore)', () => {
		const store = new UIStateStore();
		expect(store.subscribe).toBe(store.subscribe);
		expect(store.getSnapshot).toBe(store.getSnapshot);
	});
});
