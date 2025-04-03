import type { BurgerBlock } from './block/block.js';
import type { BlockOptions } from './block/types.js';
import type { BurgerEditorEngine } from './engine/engine.js';

import { EditorDialog } from './editor-dialog.js';

export class BlockOptionsDialog extends EditorDialog {
	#currentBlock: BurgerBlock | null = null;

	constructor(engine: BurgerEditorEngine) {
		super('options', engine, document.createElement('div'), {
			buttons: {
				close: 'キャンセル',
				complete: '決定',
			},
		});
	}

	/**
	 *
	 * @param callback
	 * @deprecated
	 */
	onChangeBlock(callback: (block: BurgerBlock) => void) {
		this.engine.el.addEventListener('bge:block-change', (e) => {
			callback(e.detail.block);
		});
	}

	setContainerProps(formData: FormData) {
		if (!this.#currentBlock) {
			return;
		}

		const columns = formData.get('bge-options-columns');
		const justify = formData.get('bge-options-justify');
		const align = formData.get('bge-options-align');
		const float = formData.get('bge-options-float');
		const classes = formData.get('bge-options-classes');
		const id = formData.get('bge-options-id');

		const styles = formData
			.keys()
			.toArray()
			.filter((key) => key.startsWith('bge-options-style-'))
			.map((key) => {
				const propName = formData.get(key);
				const category = key.replace('bge-options-style-', '');
				return [category, propName];
			});

		const currentOptions = this.#currentBlock.exportOptions();

		const newOptions: BlockOptions = {
			props: {
				...currentOptions.props,
				columns: columns ? Number(columns) : null,
				justify: justify as
					| 'center'
					| 'start'
					| 'end'
					| 'between'
					| 'around'
					| 'evenly'
					| null,
				align: align as
					| 'align-center'
					| 'align-start'
					| 'align-end'
					| 'align-stretch'
					| 'align-baseline'
					| null,
				float: float as 'start' | 'end' | null,
			},
			classList: classes ? classes.toString().split(/\s+/) : currentOptions.classList,
			id: id ? id.toString() : currentOptions.id,
			style: Object.fromEntries(styles),
		};

		this.#currentBlock.importOptions(newOptions);
	}

	override complete(formData: FormData) {
		this.setContainerProps(formData);
		super.complete(formData);
	}

	override open() {
		const component = document.createElement('div');
		component.dataset.bgeEditorUi = 'blockOptions';
		this.setTemplate(component);

		super.open();
		this.reset();

		const currentBlock = this.engine.getCurrentBlock();
		if (currentBlock) {
			this.#currentBlock = currentBlock;
		}
	}

	override reset() {
		this.#currentBlock = null;
		super.reset();
	}
}
