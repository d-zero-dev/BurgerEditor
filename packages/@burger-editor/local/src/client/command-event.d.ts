/**
 * Minimal typing for the Invoker Commands API `CommandEvent`.
 *
 * TypeScript's DOM lib does not ship this interface yet. The event is
 * dispatched on the element referenced by a button's `commandfor`
 * attribute and does not bubble.
 */
interface InvokerCommandEvent extends Event {
	/**
	 * The command name declared on the invoker button.
	 */
	readonly command: string;

	/**
	 * The button element that invoked the command.
	 */
	readonly source: Element | null;
}

interface HTMLElementEventMap {
	command: InvokerCommandEvent;
}
