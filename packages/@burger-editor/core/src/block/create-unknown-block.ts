import type { BurgerEditorEngine } from '../engine/engine.js';

import { BurgerBlock } from './block.js';

/**
 * 未知のブロックを作成する
 * @param html - 未知のブロックのHTML文字列
 * @param engine - BurgerEditorEngineインスタンス
 * @returns 作成されたBurgerBlockインスタンス
 * @description
 * 1. wysiwygブロックを作成
 * 2. HTMLをwysiwygアイテムにインポート
 * 3. ブロック名を'unknown'に設定
 * 4. コンテナタイプを'grid:1'に設定
 */
export async function createUnknownBlock(
	html: string,
	engine: BurgerEditorEngine,
): Promise<BurgerBlock> {
	const block = await BurgerBlock.new(engine, 'wysiwyg');
	await block.items[0]?.import({ wysiwyg: html });
	block.el.dataset.bgeName = 'unknown';
	block.el.dataset.bgeContainer = 'grid:1';
	return block;
}
