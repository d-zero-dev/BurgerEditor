import type { BurgerBlock } from './block.js';
import type { BlockData } from '../types.js';

/**
 * Apply the block options dialog's submitted form data to a block.
 * Extracted from the former BlockOptionsDialog so the declarative dialog
 * shell can reuse it on submit.
 * @param block - The block to update
 * @param formData - The submitted `bge-options-*` form data
 * @example
 * ```ts
 * // フォーム側は `bge-options-<name>` 規約のname属性を持つ:
 * // bge-options-container-type / bge-options-columns / bge-options-classes /
 * // bge-options-id / bge-options-style-<category> など
 * const formData = new FormData(optionsFormElement);
 * applyBlockOptions(block, formData);
 * engine.save();
 * ```
 */
export function applyBlockOptions(block: BurgerBlock, formData: FormData) {
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

	const currentOptions = block.exportOptions();

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

	block.importOptions(newOptions);
}
