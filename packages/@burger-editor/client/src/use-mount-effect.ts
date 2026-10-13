import { useEffect, useEffectEvent } from 'react';

/**
 * Run `fn` exactly once, when the component mounts, always reading `fn`'s
 * latest closure (via `useEffectEvent`) rather than the one captured at
 * mount time.
 *
 * Exists so a mount-only effect can honestly declare `useEffect(fn, [])`
 * without an `eslint-disable-next-line react-hooks/exhaustive-deps` — that
 * suppression is also a React Compiler bailout condition for the whole
 * component containing it (see ARCHITECTURE.md's negative-knowledge note
 * on React Compiler).
 * @param fn - Called once on mount
 * @example
 * ```tsx
 * useMountEffect(() => {
 * 	fileBrowser.select(fileType, state.path ?? '', size);
 * });
 * ```
 */
export function useMountEffect(fn: () => void): void {
	const onMount = useEffectEvent(fn);
	useEffect(() => {
		onMount();
	}, []);
}
