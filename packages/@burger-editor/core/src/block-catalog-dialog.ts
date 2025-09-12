import type { BurgerEditorEngine } from './engine/engine.js';
import type { BlockCatalog, CatalogItem, BlockData } from './types.js';

import { EditorDialog } from './editor-dialog.js';

export class BlockCatalogDialog extends EditorDialog {
	readonly catalog: ReadonlyMap<string, readonly CatalogItem[]>;

	constructor(engine: BurgerEditorEngine, catalog: BlockCatalog) {
		super('catalog', engine, document.createElement('div'), {
			buttons: {
				close: 'キャンセル',
			},
		});

		this.catalog = new Map(Object.entries(catalog));
	}

	async addBlock(blockData: BlockData) {
		await this.engine.addBlock(blockData);
		this.close();
	}

	override open() {
		const component = document.createElement('div');
		component.dataset.bgeEditorUi = 'blockCatalog';
		this.setTemplate(component);
		super.open();
	}
}
