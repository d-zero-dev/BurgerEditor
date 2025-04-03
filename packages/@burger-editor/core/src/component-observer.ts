import type { Actions } from './types.js';

type AbstractListener = (payload: Actions[keyof Actions]) => void;

export class ComponentObserver {
	#listeners = new Map<AbstractListener, keyof Actions>();

	notify<A extends keyof Actions>(name: A, payload: Actions[A]) {
		window.dispatchEvent(new CustomEvent(`bge:${name}`, { detail: payload }));
	}

	off() {
		for (const [listener, name] of this.#listeners) {
			// @ts-ignore
			window.removeEventListener(`bge:${name}`, listener);
		}
		this.#listeners.clear();
	}

	on<A extends keyof Actions>(name: A, listener: (payload: Actions[A]) => void) {
		this.#listeners.set(listener as AbstractListener, name);
		window.addEventListener(`bge:${name}`, (e) => listener((e as CustomEvent).detail));
	}
}
