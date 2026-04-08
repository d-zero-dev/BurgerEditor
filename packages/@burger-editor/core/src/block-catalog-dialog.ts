import type { DialogSettings } from './editor-dialog.js';
import type { BlockCatalog, CatalogItem, BlockData } from './types.js';

import { EditorDialog } from './editor-dialog.js';

export interface BlockCatalogDialogSettings extends DialogSettings {
	addBlock: (blockData: BlockData) => Promise<void>;
}

export class BlockCatalogDialog extends EditorDialog {
	readonly catalog: ReadonlyMap<string, readonly CatalogItem[]>;
	#addBlock: (blockData: BlockData) => Promise<void>;

	constructor(catalog: BlockCatalog, settings: BlockCatalogDialogSettings) {
		super('catalog', settings, {
			buttons: {
				close: 'キャンセル',
			},
		});

		this.catalog = new Map(Object.entries(catalog));
		this.#addBlock = settings.addBlock;
	}

	async addBlock(blockData: BlockData) {
		await this.#addBlock(blockData);
		this.close();
	}

	override open() {
		const component = document.createElement('div');
		component.dataset.bgeEditorUi = 'blockCatalog';
		this.setTemplate(component);
		super.open();
	}
}
