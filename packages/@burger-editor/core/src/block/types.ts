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

/**
 * The closed vocabulary of block-scoped mutations `applyLiveBlockOp`
 * accepts. Defined here (plain TypeScript, no zod) rather than in
 * `@burger-editor/cli`, whose `blockOpSchema` validates the identical shape
 * at the process boundary — core is the dependency leaf `cli` builds on,
 * so the type has to live on this side for `live-block-ops.ts` to use it
 * without core depending on cli. `blockHtml` is pre-rendered HTML (from a
 * disk-side catalog lookup); this vocabulary never resolves a catalog
 * entry itself.
 * @example
 * ```ts
 * const op: BlockOp = { op: 'move', from: 0, to: 2 }; // [A,B,C,D] -> [B,C,A,D]
 * ```
 */
export type BlockOp =
	| { readonly op: 'insert'; readonly index: number; readonly blockHtml: string }
	| { readonly op: 'replace'; readonly index: number; readonly blockHtml: string }
	| { readonly op: 'delete'; readonly index: number }
	| { readonly op: 'move'; readonly from: number; readonly to: number }
	| { readonly op: 'duplicate'; readonly index: number }
	| {
			readonly op: 'update-item';
			readonly index: number;
			readonly itemIndex: number;
			readonly data: Record<string, unknown>;
	  }
	| { readonly op: 'set-id'; readonly index: number; readonly id: string };
