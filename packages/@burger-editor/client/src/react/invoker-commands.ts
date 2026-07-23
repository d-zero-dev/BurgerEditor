/**
 * JSX typing for the Invoker Commands API.
 *
 * React 19 passes unknown lowercase attributes through to the DOM, so
 * `command` / `commandfor` work at runtime; this augmentation makes them
 * type-check. Click handlers are forbidden in this codebase — every button
 * action is declared with these attributes instead.
 */
import 'react';

declare module 'react' {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- 宣言マージには元の型パラメータリストと同一である必要がある
	interface ButtonHTMLAttributes<T> {
		/**
		 * Built-in (`show-modal`, `close`, …) or custom (`--`-prefixed)
		 * command to invoke on the `commandfor` target.
		 */
		command?: string;

		/**
		 * The id of the element the command is dispatched on. Must be in
		 * the same document as the button.
		 */
		commandfor?: string;
	}
}
