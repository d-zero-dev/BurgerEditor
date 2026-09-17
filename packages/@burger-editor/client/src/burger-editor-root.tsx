import { applyBlockOptions } from '@burger-editor/core';

import { BlockCatalog } from './components/block-catalog.js';
import { BlockOptions } from './components/block-options.js';
import { ItemEditorHost } from './components/item-editor-host.js';
import { EditorDialog } from './editor-dialog.js';
import { useEngine } from './engine-context.js';
import { useUIState } from './use-engine.js';

/**
 * Root of the editor chrome React tree. Renders every dialog
 * declaratively from the engine's UI state store. Reads the engine via
 * {@link useEngine}; the caller wraps this in an `EngineProvider`.
 */
export function BurgerEditorRoot() {
	const engine = useEngine();
	const ui = useUIState();
	const open = ui.openDialog;
	const optionsBlock = open?.type === 'block-options' ? open.block : null;
	const itemEditor = open?.type === 'item-editor' ? open : null;

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
				<BlockCatalog catalog={engine.catalog} />
			</EditorDialog>
			<EditorDialog
				name="options"
				open={optionsBlock !== null}
				onClose={closeAndSave}
				action={(formData) => {
					// ダイアログ表示中にホバー選択が外れても適用できるよう、
					// openDialog状態にスナップショットされたblockを使う
					if (optionsBlock) {
						applyBlockOptions(optionsBlock, formData);
					}
					closeAndSave();
				}}
				buttons={{ close: 'キャンセル', complete: '決定' }}>
				{optionsBlock ? <BlockOptions block={optionsBlock} /> : null}
			</EditorDialog>
			<ItemEditorHost
				item={itemEditor?.item ?? null}
				containerType={itemEditor?.containerType}
			/>
		</>
	);
}
