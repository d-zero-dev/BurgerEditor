import type { Actions } from './types.js';

type AbstractListener = (payload: Actions[keyof Actions]) => void;

let instanceId = 0;

export class ComponentObserver {
	readonly #instanceId: number;
	#listeners = new Map<AbstractListener, keyof Actions>();

	constructor() {
		this.#instanceId = instanceId++;
	}

	notify<A extends keyof Actions>(name: A, payload: Actions[A]) {
		window.dispatchEvent(
			new CustomEvent(`bge:_${this.#instanceId}_:${name}`, { detail: payload }),
		);
	}

	off() {
		for (const [listener, name] of this.#listeners) {
			// @ts-ignore
			window.removeEventListener(`bge:_${this.#instanceId}_:${name}`, listener);
		}
		this.#listeners.clear();
	}

	on<A extends keyof Actions>(name: A, listener: (payload: Actions[A]) => void) {
		this.#listeners.set(listener as AbstractListener, name);
		window.addEventListener(`bge:_${this.#instanceId}_:${name}`, (e) => {
			listener((e as CustomEvent).detail);
		});
	}
}
