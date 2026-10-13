import type { SelectedFile } from './store.js';

import { useEffect, useEffectEvent, useRef } from 'react';

/**
 * React to a file becoming selected from outside the item's own `Editor`
 * (i.e. via `FileList`, in the same `FileBrowserStore` the item's own
 * `fileType` uses) — `onExternalChange` is called with the new selection.
 *
 * `selected` is shared per-engine across every item that opens onto the
 * same `fileType`, so it can still hold a *previous* item's selection at
 * the moment a new `Editor` instance mounts. This hook's first effect run
 * is always skipped for that reason — reacting to it would load that
 * stale, unrelated selection into the freshly-mounted item's own state,
 * racing the item's own mount-time `fileBrowser.select(fileType, ownPath)`
 * call (whichever one's async work — if any — finishes last wins,
 * corrupting the item with a different item's file). Callers still need
 * their own mount effect to register their own current path with the
 * store; this hook only covers reacting to *later* external changes.
 * @param selected - The `fileType`'s current selection (from
 * `useSyncExternalStore(fileBrowser.subscribe, () =>
 * fileBrowser.getSnapshot().selected[fileType])`)
 * @param getCurrentPath - Returns the item's own current path at call
 * time (a function, not a plain value, so the effect doesn't need it in
 * its dependency array and can stay `[selected]`-only)
 * @param onExternalChange - Called when `selected` changes to a path
 * different from `getCurrentPath()`, after the initial mount is skipped
 * @example
 * ```tsx
 * const selected = useSyncExternalStore(
 * 	fileBrowser.subscribe,
 * 	() => fileBrowser.getSnapshot().selected.image,
 * );
 * useExternalFileSelection(
 * 	selected,
 * 	() => state.path ?? '',
 * 	(next) => setState((prev) => ({ ...prev, path: next.path })),
 * );
 * ```
 */
export function useExternalFileSelection(
	selected: SelectedFile | undefined,
	getCurrentPath: () => string,
	onExternalChange: (selected: SelectedFile) => void,
): void {
	const skipNextRun = useRef(true);
	// getCurrentPath/onExternalChangeをuseEffectEventで読むことで、依存配列を
	// [selected]だけの正直な形に保てる（exhaustive-depsの抑制が不要になる —
	// 抑制コメントの存在自体がReact Compilerの別のバイルアウト条件でもある）
	const handleSelectedChange = useEffectEvent(() => {
		if (skipNextRun.current) {
			skipNextRun.current = false;
			return;
		}
		if (!selected?.path || selected.path === getCurrentPath()) {
			return;
		}
		onExternalChange(selected);
	});

	useEffect(() => {
		handleSelectedChange();
	}, [selected]);
}
