import { hasBlockStructureChanged } from './block-structure.js';

/**
 * When the page editor may write to disk, and what it has to tell the
 * server and the Agent Hub about it. Kept apart from `create-editor.ts`
 * (which wires it to the engine, the DOM and the network) so the decisions
 * are testable without an editor instance.
 */
export interface SaveGate {
	/**
	 * Call from the editor's `onUpdated` with the content it replaces and the
	 * new content. Returns whether to POST it. Before {@link SaveGate.ready},
	 * the update comes from the engine's own `save()` while it initializes —
	 * nobody has edited anything, so opening a page never writes it (issue
	 * #966). A change to the block list at that point is kept as
	 * {@link SaveGate.normalizedOnOpen} instead.
	 */
	shouldPost(previous: string, content: string): boolean;
	/** Call once the editor has finished initializing. */
	ready(): void;
	/** Call with the result of each POST. */
	recordSave(saved: boolean): void;
	/**
	 * Whether the next POST asks the server to create a missing file — only
	 * until the first successful save of a page that didn't exist when it was
	 * opened. After that, a missing file was deleted or moved elsewhere.
	 */
	readonly createIfMissing: boolean;
	/** The content as the editor normalized it on open, when that changed the block list; for the Agent Hub. */
	readonly normalizedOnOpen: string | undefined;
}

/**
 * @param options
 * @param options.isNewFile - Whether the page's file didn't exist when it was opened
 * @example
 * ```ts
 * const gate = createSaveGate({ isNewFile: true });
 * gate.shouldPost('', '<p>x</p>'); // false — still initializing
 * gate.ready();
 * gate.shouldPost('<p>x</p>', '<p>y</p>'); // true
 * ```
 */
export function createSaveGate(options: { readonly isNewFile: boolean }): SaveGate {
	let initialized = false;
	let createIfMissing = options.isNewFile;
	let normalizedOnOpen: string | undefined;

	return {
		shouldPost(previous, content) {
			if (initialized) {
				return true;
			}
			if (hasBlockStructureChanged(previous, content)) {
				normalizedOnOpen = content;
			}
			return false;
		},
		ready() {
			initialized = true;
		},
		recordSave(saved) {
			if (saved) {
				createIfMissing = false;
			}
		},
		get createIfMissing() {
			return createIfMissing;
		},
		get normalizedOnOpen() {
			return normalizedOnOpen;
		},
	};
}
