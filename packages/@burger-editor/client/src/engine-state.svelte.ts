import type { Actions, BurgerEditorEngine } from '@burger-editor/core';

/**
 * Bridge between ComponentObserver events and Svelte's $state reactivity.
 *
 * Subscribes to ComponentObserver events and stores the latest payload
 * as reactive $state values. Components can read these values directly
 * instead of subscribing to events via engine.componentObserver.on().
 */
export class EngineState {
	fileList = $state<Actions['file-listup'] | null>(null);
	fileSelection = $state<Actions['file-select'] | null>(null);
	openEditor = $state<Actions['open-editor'] | null>(null);
	selectedBlock = $state<Actions['select-block'] | null>(null);
	selectedTabIndex = $state<number>(0);
	uploadProgress = $state<Actions['file-upload-progress'] | null>(null);

	readonly #engine: BurgerEditorEngine;

	constructor(engine: BurgerEditorEngine) {
		this.#engine = engine;

		engine.componentObserver.on('select-block', (payload) => {
			this.selectedBlock = payload;
		});

		engine.componentObserver.on('file-select', (payload) => {
			this.fileSelection = payload;
		});

		engine.componentObserver.on('file-upload-progress', (payload) => {
			this.uploadProgress = payload;
		});

		engine.componentObserver.on('file-listup', (payload) => {
			this.fileList = payload;
		});

		engine.componentObserver.on('open-editor', (payload) => {
			this.openEditor = payload;
		});

		engine.componentObserver.on('select-tab-in-item-editor', (payload) => {
			this.selectedTabIndex = payload.index;
		});
	}

	notify<A extends keyof Actions>(name: A, payload: Actions[A]) {
		this.#engine.componentObserver.notify(name, payload);
	}
}
