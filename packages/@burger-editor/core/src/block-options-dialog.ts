import type { BurgerBlock } from './block/block.js';
import type { DialogSettings } from './editor-dialog.js';
import type { BlockData } from './types.js';

import { EditorDialog } from './editor-dialog.js';

export interface BlockOptionsDialogSettings extends DialogSettings {
	onChangeBlock: (callback: (block: BurgerBlock) => void) => void;
	getCurrentBlock: () => BurgerBlock | null;
}

export class BlockOptionsDialog extends EditorDialog {
	#currentBlock: BurgerBlock | null = null;
	#getCurrentBlock: () => BurgerBlock | null;
	#onChangeBlock: (callback: (block: BurgerBlock) => void) => void;

	constructor(settings: BlockOptionsDialogSettings) {
		super('options', document.createElement('div'), settings, {
			buttons: {
				close: 'キャンセル',
				complete: '決定',
			},
		});

		this.#onChangeBlock = settings.onChangeBlock;
		this.#getCurrentBlock = settings.getCurrentBlock;
	}

	/**
	 *
	 * @param callback
	 * @deprecated
	 */
	onChangeBlock(callback: (block: BurgerBlock) => void) {
		this.#onChangeBlock(callback);
	}

	setContainerProps(formData: FormData) {
		if (!this.#currentBlock) {
			return;
		}

		const containerType = formData.get('bge-options-container-type');
		const columns = formData.get('bge-options-columns');
		const autoRepeat = formData.get('bge-options-auto-repeat');
		const justify = formData.get('bge-options-justify');
		const align = formData.get('bge-options-align');
		const float = formData.get('bge-options-float');
		const classes = formData.get('bge-options-classes');
		const id = formData.get('bge-options-id');
		const linkarea = formData.get('bge-options-linkarea');
		const repeatMinInlineSize = formData.get('bge-options-repeat-min-inline-size') as
			| string
			| null;

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

		const newOptions: Partial<BlockData> = {
			containerProps: {
				...currentOptions.containerProps,
				type:
					(containerType as 'grid' | 'inline' | 'float') ??
					currentOptions.containerProps.type,
				columns: columns ? Number(columns) : null,
				autoRepeat: (autoRepeat as 'fixed' | 'auto-fill' | 'auto-fit') ?? 'fixed',
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
				linkarea: linkarea === 'true',
				repeatMinInlineSize: repeatMinInlineSize || null,
			},
			classList:
				classes
					?.toString()
					.split(/\s+/)
					.map((cls) => cls.trim())
					.filter((cls) => !!cls) ?? [],
			id: id?.toString().trim() || null,
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

		const currentBlock = this.#getCurrentBlock();
		if (currentBlock) {
			this.#currentBlock = currentBlock;
		}
	}

	override reset() {
		this.#currentBlock = null;
		super.reset();
	}
}
