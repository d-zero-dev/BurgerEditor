/**
 * Minimal typing for the Invoker Commands API `CommandEvent`.
 *
 * TypeScript's DOM lib does not ship this interface yet, so the engine
 * defines the subset it relies on. The event is dispatched on the element
 * referenced by a button's `commandfor` attribute and does not bubble.
 */
export interface BurgerCommandEvent extends Event {
	/**
	 * The command name declared on the invoker button (e.g. `--add-block`).
	 */
	readonly command: string;

	/**
	 * The button element that invoked the command.
	 */
	readonly source: Element | null;
}

declare global {
	interface HTMLElementEventMap {
		command: BurgerCommandEvent;
	}
}
