/**
 * JSX typing for Interest Invokers (`interestfor`) and `popover="hint"`.
 *
 * React 19 passes unknown lowercase attributes through to the DOM; these
 * augmentations make them type-check. Hint tooltips pair a controlling
 * button (`interestfor`) with a `popover="hint"` element. See the
 * {@link https://html.spec.whatwg.org/multipage/popover.html#attr-popover-hint-state | popover hint state}
 * and Interest Invokers guidance in Chrome for Developers.
 */
import 'react';

declare module 'react' {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- 宣言マージには元の型パラメータリストと同一である必要がある
	interface ButtonHTMLAttributes<T> {
		/**
		 * Id of the element shown as an interest-triggered hint popover when
		 * the button is hovered or focused.
		 */
		interestfor?: string;
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	interface HTMLAttributes<T> {
		/** Popover state; `hint` is dismissed with Esc without moving focus. */
		popover?: '' | 'auto' | 'manual' | 'hint';
	}
}

/**
 * Re-exported so module augmentation survives d.ts bundling.
 */
export interface InterestHintAttributes {
	readonly interestfor?: string;
	readonly popover?: '' | 'auto' | 'manual' | 'hint';
}
