import type { BurgerCommandEvent } from '@burger-editor/core';
import type { RefObject } from 'react';

import { useEffect, useRef } from 'react';

export type CommandHandlers = {
	readonly [command: `--${string}`]: (event: BurgerCommandEvent) => void;
};

/**
 * Receive Invoker Commands API `command` events on the element the returned
 * ref is attached to. Buttons address the element with
 * `commandfor={idOfElement}`; `CommandEvent` does not bubble, so the ref
 * must be on the exact `commandfor` target.
 * @param handlers - Map of custom command names to handlers
 * @returns A ref to attach to the receiving element
 */
export function useCommand<T extends HTMLElement>(
	handlers: CommandHandlers,
): RefObject<T | null> {
	const ref = useRef<T>(null);
	const handlersRef = useRef(handlers);

	useEffect(() => {
		handlersRef.current = handlers;
	});

	useEffect(() => {
		const el = ref.current;
		if (!el) {
			return;
		}
		const onCommand = (event: BurgerCommandEvent) => {
			const handler = handlersRef.current[event.command as `--${string}`];
			handler?.(event);
		};
		el.addEventListener('command', onCommand);
		return () => {
			el.removeEventListener('command', onCommand);
		};
	}, []);

	return ref;
}
