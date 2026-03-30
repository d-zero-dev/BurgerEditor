import type { Actions } from './types.js';

let instanceId = 0;

export class ComponentObserver {
	readonly #instanceId: number;
	#listeners = new Map<EventListener, keyof Actions>();

	constructor() {
		this.#instanceId = instanceId++;
	}

	/**
	 * Dispatch a custom event on the window.
	 * @param name
	 * @param payload
	 */
	notify<A extends keyof Actions>(name: A, payload: Actions[A]) {
		window.dispatchEvent(
			new CustomEvent(`bge:_${this.#instanceId}_:${name}`, { detail: payload }),
		);
	}

	/**
	 * Remove all registered event listeners and clear the internal map.
	 */
	off() {
		for (const [wrapper, name] of this.#listeners) {
			window.removeEventListener(`bge:_${this.#instanceId}_:${name}`, wrapper);
		}
		this.#listeners.clear();
	}

	/**
	 * Register an event listener. Each call creates a separate wrapper,
	 * so calling with the same listener multiple times will fire it
	 * multiple times per event.
	 * @param name
	 * @param listener
	 */
	on<A extends keyof Actions>(name: A, listener: (payload: Actions[A]) => void) {
		const wrapper: EventListener = (e) => {
			listener((e as CustomEvent).detail);
		};
		this.#listeners.set(wrapper, name);
		window.addEventListener(`bge:_${this.#instanceId}_:${name}`, wrapper);
	}
}
