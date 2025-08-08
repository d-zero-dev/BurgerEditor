import type { ElementSeed } from '../utils/types.js';
import type { Extensions } from '@tiptap/core';

export interface BgeWysiwygElementOptions {
	extensions?: Extensions;
	wrapperElement?: ElementSeed;
}

export interface Transaction {
	state: EditorState;
}

export type EditorState = Record<EditorNode, NodeState>;

type EditorNode =
	| 'bold'
	| 'italic'
	| 'underline'
	| 'strike'
	| 'code'
	| 'link'
	| 'buttonLikeLink'
	| 'blockquote'
	| 'bulletList'
	| 'orderedList'
	| 'note'
	| 'h1'
	| 'h2'
	| 'h3'
	| 'h4'
	| 'h5'
	| 'h6'
	| 'flexBox';

export type NodeState = {
	disabled: boolean;
	active: boolean;
};
