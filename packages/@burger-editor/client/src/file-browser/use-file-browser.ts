import type { FileBrowserStore } from './store.js';

import { useEngine } from '../engine-context.js';

import { getFileBrowserStore } from './store.js';

/**
 * Get the current engine's `FileBrowserStore` — file-list query cache,
 * current selection and upload progress shared by `FileList`,
 * `FileUploader`, `Preview` and the item's own `Editor`.
 * @returns The engine's file-browser store
 * @example
 * ```tsx
 * const fileBrowser = useFileBrowser();
 * const selected = useSyncExternalStore(
 * 	fileBrowser.subscribe,
 * 	() => fileBrowser.getSnapshot().selected.image,
 * );
 * ```
 */
export function useFileBrowser(): FileBrowserStore {
	const engine = useEngine();
	return getFileBrowserStore(engine);
}
