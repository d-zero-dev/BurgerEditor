import type { BlockCatalog as BlockCatalogData } from '@burger-editor/core';

import { cleanup, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';

import { createMockEngine } from '../testing/create-mock-engine.js';
import { renderWithEngine } from '../testing/render-with-engine.js';

import { BlockCatalog } from './block-catalog.js';

afterEach(() => {
	cleanup();
	sessionStorage.clear();
});

/**
 * BlockCatalogの描画に必要なengineモックを作る
 * @param receiverId - engine.commandBus.receiverIdに設定する値
 */
function createCatalogMockEngine(receiverId: string) {
	return createMockEngine({
		storageKey: { blockClipboard: 'bge-copied-block' },
		commandBus: { receiverId },
	});
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
	const engine = createCatalogMockEngine('bge-command-bus-from-engine');
	renderWithEngine(engine, <BlockCatalog catalog={catalog} />);

	expect(screen.getByText('見出し').closest('button')?.getAttribute('commandfor')).toBe(
		'bge-command-bus-from-engine',
	);
});

test('クリップボードにブロックがあるときだけ貼り付けボタンが表示され、そのcommandforもreceiverIdを指す', () => {
	const engine = createCatalogMockEngine('bge-command-bus-from-engine');
	sessionStorage.setItem('bge-copied-block', '{}');

	renderWithEngine(engine, <BlockCatalog catalog={catalog} />);

	expect(
		screen
			.getByText('クリップボードから貼り付け')
			.closest('button')
			?.getAttribute('commandfor'),
	).toBe('bge-command-bus-from-engine');
});

test('クリップボードが空のときは貼り付けボタンが表示されない', () => {
	const engine = createCatalogMockEngine('bge-command-bus-from-engine');
	renderWithEngine(engine, <BlockCatalog catalog={catalog} />);

	expect(screen.queryByText('クリップボードから貼り付け')).toBeNull();
});
