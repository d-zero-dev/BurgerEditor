import type { ItemData } from '../item/types.js';

export interface BlockData extends BlockOptions {
	readonly itemData: readonly ItemData[];
}

export interface BlockOptions {
	readonly props: ContainerProps;
	readonly classList: readonly string[];
	readonly id: string | null;
	readonly style: Record<string, string>;
}

export type ContainerProps = {
	readonly type: ContainerType;
	readonly immutable: boolean;
	readonly autoRepeat: 'fixed' | 'auto-fill' | 'auto-fit';
	readonly justify: 'center' | 'start' | 'end' | 'between' | 'around' | 'evenly' | null;
	readonly align:
		| 'align-center'
		| 'align-start'
		| 'align-end'
		| 'align-stretch'
		| 'align-baseline'
		| null;
	readonly wrap: 'wrap' | 'nowrap' | null;
	readonly columns: number | null;
	readonly float: 'start' | 'end' | null;
	readonly frameSemantics: ContainerFrameSemantics;
};

export type ContainerType = 'grid' | 'inline' | 'float';

export type ContainerFrameSemantics = 'div' | 'ul' | 'ol';
