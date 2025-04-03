import type { BurgerEditorEngine } from './engine/engine.js';
import type { BlockCatalog, BlockTemplate, CatalogItem } from './types.js';

import { EditorDialog } from './editor-dialog.js';

export class BlockCatalogDialog extends EditorDialog {
	readonly catalog: ReadonlyMap<string, ReadonlyMap<string, CatalogItem>>;

	constructor(
		engine: BurgerEditorEngine,
		catalog: BlockCatalog,
		blockTemplateMap: Record<string, BlockTemplate>,
	) {
		super('catalog', engine, document.createElement('div'), {
			buttons: {
				close: 'キャンセル',
			},
		});

		this.catalog = new Map(
			Object.entries(catalog).map(([category, blocks]) => {
				const blockMap = new Map(
					Object.entries(blocks).map(([name, block]) => {
						const blockTemplace = blockTemplateMap[name];
						if (!blockTemplace) {
							throw new Error(`Block "${name}" is not found.`);
						}

						const blockInfo: CatalogItem =
							typeof block === 'string'
								? {
										label: block || name,
										svg: blockTemplace.icon,
									}
								: {
										...blockTemplace,
										svg: blockTemplace.icon,
										...block,
									};

						return [name, blockInfo];
					}),
				);
				return [category, blockMap];
			}),
		);
	}

	override open() {
		const component = document.createElement('div');
		component.dataset.bgeEditorUi = 'blockCatalog';
		this.setTemplate(component);
		super.open();
	}
}
