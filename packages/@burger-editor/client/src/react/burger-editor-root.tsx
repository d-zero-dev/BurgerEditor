import type { BurgerEditorEngine } from '@burger-editor/core';

import { applyBlockOptions } from '@burger-editor/core';

import { BlockCatalog } from './components/block-catalog.js';
import { BlockOptions } from './components/block-options.js';
import { ItemEditorHost } from './components/item-editor-host.js';
import { EditorDialog } from './editor-dialog.js';
import { useUIState } from './use-engine.js';

/**
 * Root of the editor chrome React tree. Renders every dialog
 * declaratively from the engine's UI state store.
 * @param root0
 * @param root0.engine
 */
export function BurgerEditorRoot({ engine }: { readonly engine: BurgerEditorEngine }) {
	const ui = useUIState(engine);
	const open = ui.openDialog;
	const optionsBlock = open?.type === 'block-options' ? open.block : null;

	const closeAndSave = () => {
		engine.uiState.closeDialog();
		engine.save();
	};

	return (
		<>
			<EditorDialog
				name="catalog"
				open={open?.type === 'block-catalog'}
				onClose={closeAndSave}
				buttons={{ close: 'キャンセル' }}>
				<BlockCatalog engine={engine} catalog={engine.catalog} />
			</EditorDialog>
			<EditorDialog
				name="options"
				open={optionsBlock !== null}
				onClose={closeAndSave}
				onComplete={(formData) => {
					// ダイアログ表示中にホバー選択が外れても適用できるよう、
					// openDialog状態にスナップショットされたblockを使う
					if (optionsBlock) {
						applyBlockOptions(optionsBlock, formData);
					}
					engine.uiState.closeDialog();
				}}
				buttons={{ close: 'キャンセル', complete: '決定' }}>
				{optionsBlock ? <BlockOptions engine={engine} block={optionsBlock} /> : null}
			</EditorDialog>
			<ItemEditorHost
				engine={engine}
				item={open?.type === 'item-editor' ? open.item : null}
			/>
		</>
	);
}
