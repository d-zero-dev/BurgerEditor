import type { BurgerCommandEvent } from './types.js';

import { asDisposableFn } from '../utils/as-disposable-fn.js';

/**
 * Prefix for the id assigned to every command bus receiver element.
 *
 * Buttons address the engine with `commandfor={engine.commandBus.receiverId}`.
 * The receiver is unique per document, not per page: the engine installs one
 * in the main document and one in each EditableArea iframe, because
 * `commandfor` can only reference an id within its own document and
 * `CommandEvent` does not bubble.
 * @deprecated Use {@link CommandBus.receiverId} on the bus instance instead.
 * This constant is only the id's prefix — a fixed id would collide when two
 * engines share the same document, so each `CommandBus` appends its own
 * sequence number.
 * @example
 * ```tsx
 * <button command="--remove-block" commandfor={engine.commandBus.receiverId}>削除</button>
 * ```
 */
export const COMMAND_BUS_ID = 'bge-command-bus';

export type CommandName = `--${string}`;

export type CommandHandler = (event: BurgerCommandEvent) => void;

let receiverSequence = 0;

/**
 * Centralized dispatcher for Invoker Commands API custom commands.
 *
 * A single dispatch table (command name → handler) serves any number of
 * receiver elements. UI code never adds click listeners; buttons declare
 * `command`/`commandfor` and the bus routes the resulting `command` events
 * to engine operations.
 * @example
 * ```ts
 * const bus = new CommandBus();
 * bus.define('--my-action', (event) => {
 * 	const value = (event.source as HTMLButtonElement | null)?.value;
 * 	// ...
 * });
 * bus.createReceiver(document.body);
 * // <button command="--my-action" commandfor={bus.receiverId} value="x">
 * ```
 */
export class CommandBus implements Disposable {
	/**
	 * Id of this bus's receiver element, unique within the page. Buttons
	 * address this bus with `commandfor={bus.receiverId}` (or, from UI code,
	 * `engine.commandBus.receiverId`).
	 *
	 * A monotonically increasing counter rather than a random value, so ids
	 * stay stable and readable across a test run or a debugging session.
	 * Uniqueness holds only within one loaded copy of this module — the same
	 * caveat as the `BurgerBlock`/`Item` module-level registries documented
	 * in ARCHITECTURE.md § 不変条件と否定的知識 applies here too.
	 */
	readonly receiverId = `${COMMAND_BUS_ID}-${++receiverSequence}`;
	readonly #detachers = new Map<HTMLElement, () => void>();
	readonly #handlers = new Map<CommandName, CommandHandler>();

	[Symbol.dispose](): void {
		this.#destroy();
	}
	/**
	 * Install a receiver element into the given parent and attach the bus
	 * to it. Call once per document that hosts command-invoking buttons.
	 * @param parent - The element the receiver is appended to
	 * @returns The receiver element
	 */
	createReceiver(parent: HTMLElement): HTMLElement {
		const receiver = parent.ownerDocument.createElement('div');
		receiver.id = this.receiverId;
		receiver.hidden = true;
		parent.append(receiver);
		this.listen(receiver);
		return receiver;
	}

	/**
	 * Register a handler for a custom command. Registering the same command
	 * twice is a programming error and throws.
	 * @param command - The custom command name (must start with `--`)
	 * @param handler - Invoked with the `command` event when dispatched
	 */
	define(command: CommandName, handler: CommandHandler) {
		if (this.#handlers.has(command)) {
			throw new Error(`Command already defined: ${command}`);
		}
		this.#handlers.set(command, handler);
	}

	/**
	 * Detach the bus from every receiver element and remove the receivers
	 * created by `createReceiver` from their documents.
	 * @deprecated Use a `using` declaration instead — this now only
	 * forwards to `[Symbol.dispose]`.
	 */
	destroy() {
		this[Symbol.dispose]();
	}
	/**
	 * Attach the dispatch table to an existing element. Use `createReceiver`
	 * unless the receiver element is managed elsewhere.
	 * @param receiver - The element `commandfor` attributes point to
	 * @returns A detach function that is also `Disposable`, so callers may
	 * either invoke it directly or hold it in a `using` declaration
	 */
	listen(receiver: HTMLElement): (() => void) & Disposable {
		const onCommand = (event: BurgerCommandEvent) => {
			const handler = this.#handlers.get(event.command as CommandName);
			handler?.(event);
		};
		receiver.addEventListener('command', onCommand);
		const detach = () => {
			receiver.removeEventListener('command', onCommand);
			this.#detachers.delete(receiver);
		};
		this.#detachers.set(receiver, detach);
		return asDisposableFn(detach);
	}
	#destroy(): void {
		for (const [receiver, detach] of this.#detachers) {
			detach();
			if (receiver.id === this.receiverId) {
				receiver.remove();
			}
		}
		this.#detachers.clear();
	}
}
