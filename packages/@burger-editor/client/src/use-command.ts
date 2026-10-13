import type { BurgerCommandEvent } from '@burger-editor/core';
import type { RefCallback } from 'react';

import { useEffect, useEffectEvent, useState } from 'react';

export type CommandHandlers = {
	readonly [command: `--${string}`]: (event: BurgerCommandEvent) => void;
};

/**
 * Receive Invoker Commands API `command` events on the element the returned
 * ref callback is attached to. Buttons address the element with
 * `commandfor={idOfElement}`; `CommandEvent` does not bubble, so the ref
 * must be on the exact `commandfor` target.
 *
 * Returns a ref **callback** (not a `RefObject`) so the listener attaches
 * as soon as the element mounts, including when the element appears later
 * from a conditional render — a `useRef` + `useEffect(..., [])` pair only
 * reads `ref.current` once, at the first commit, and would miss an
 * element that shows up afterward. `handlers` is read through
 * `useEffectEvent` so the listener always calls the latest render's
 * closure without needing `handlers` in the attach effect's deps (and
 * without re-attaching the DOM listener on every render).
 * @param handlers - Map of custom command names to handlers
 * @returns A ref callback to attach to the receiving element
 * @example
 * ```tsx
 * const rootId = useId();
 * const rootRef = useCommand<HTMLDivElement>({
 * 	'--select-tab': (e) => {
 * 		setCurrent(Number((e.source as HTMLButtonElement | null)?.value));
 * 	},
 * });
 * return (
 * 	<div ref={rootRef} id={rootId}>
 * 		<button command="--select-tab" commandfor={rootId} value="1">タブ1</button>
 * 	</div>
 * );
 * ```
 */
export function useCommand<T extends HTMLElement>(
	handlers: CommandHandlers,
): RefCallback<T> {
	const [el, setEl] = useState<T | null>(null);

	const onCommand = useEffectEvent((event: BurgerCommandEvent) => {
		const handler = handlers[event.command as `--${string}`];
		handler?.(event);
	});

	useEffect(() => {
		if (!el) {
			return;
		}
		const listener = (event: Event) => onCommand(event as BurgerCommandEvent);
		el.addEventListener('command', listener);
		return () => {
			el.removeEventListener('command', listener);
		};
	}, [el]);

	return setEl;
}
