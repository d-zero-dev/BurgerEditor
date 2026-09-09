import type {
	BlockCatalog as BlockCatalogData,
	BurgerEditorEngine,
} from '@burger-editor/core';

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';

import { BlockCatalog } from './block-catalog.js';

afterEach(() => {
	cleanup();
	sessionStorage.clear();
});

/**
 * BlockCatalogの描画に必要な最小のengineモック
 * @param receiverId - engine.commandBus.receiverIdに設定する値
 */
function createMockEngine(receiverId: string): BurgerEditorEngine {
	return {
		storageKey: { blockClipboard: 'bge-copied-block' },
		commandBus: { receiverId },
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} as any as BurgerEditorEngine;
}

const catalog: BlockCatalogData = {
	テキスト: [
		{
			label: '見出し',
			definition: { name: 'heading', containerProps: {}, items: [] },
		},
	],
};

test('カタログのボタンのcommandforはengine.commandBus.receiverIdを指す（配線漏れの検出）', () => {
	const engine = createMockEngine('bge-command-bus-from-engine');
	render(<BlockCatalog engine={engine} catalog={catalog} />);

	expect(screen.getByText('見出し').closest('button')?.getAttribute('commandfor')).toBe(
		'bge-command-bus-from-engine',
	);
});

test('クリップボードにブロックがあるときだけ貼り付けボタンが表示され、そのcommandforもreceiverIdを指す', () => {
	const engine = createMockEngine('bge-command-bus-from-engine');
	sessionStorage.setItem('bge-copied-block', '{}');

	render(<BlockCatalog engine={engine} catalog={catalog} />);

	expect(
		screen
			.getByText('クリップボードから貼り付け')
			.closest('button')
			?.getAttribute('commandfor'),
	).toBe('bge-command-bus-from-engine');
});

test('クリップボードが空のときは貼り付けボタンが表示されない', () => {
	const engine = createMockEngine('bge-command-bus-from-engine');
	render(<BlockCatalog engine={engine} catalog={catalog} />);

	expect(screen.queryByText('クリップボードから貼り付け')).toBeNull();
});
