import type { BlockItem } from '../types.js';
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
	readonly linkarea: boolean;
	readonly repeatMinInlineSize: string | null;
};

export type ContainerType = 'grid' | 'inline' | 'float';

export type ContainerFrameSemantics = 'div' | 'ul' | 'ol';

export type CreateItemElement = (
	item: BlockItem | HTMLElement,
) => Promise<HTMLElement> | HTMLElement;
