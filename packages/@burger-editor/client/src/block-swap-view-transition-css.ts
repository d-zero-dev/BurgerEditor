/**
 * Editable-area iframe 文書に注入するブロック入れ替え View Transition 用 CSS。
 * アニメ時間と prefers-reduced-motion はここが正であり、`replace-element.spec.ts`
 * でも同じ文字列を注入して検証する。
 */
export const BLOCK_SWAP_VIEW_TRANSITION_CSS = `
::view-transition {
	pointer-events: none;
}

::view-transition-group(*) {
	animation-duration: 600ms;
}

@media (prefers-reduced-motion: reduce) {
	::view-transition-group(*),
	::view-transition-old(*),
	::view-transition-new(*) {
		animation: none;
	}
}
`.trim();
