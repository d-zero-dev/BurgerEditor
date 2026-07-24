import type { ReactNode } from 'react';

import { createRoot } from 'react-dom/client';

/**
 * Mount a React node into a DOM container and return a cleanup handle,
 * matching the `UICreator` contract shape used across the engine.
 * @param node - The React node to render
 * @param target - The DOM container
 * @returns An object whose `cleanUp` unmounts the root
 */
export function reactMount(node: ReactNode, target: HTMLElement) {
	const root = createRoot(target);
	root.render(node);
	return {
		cleanUp: () => {
			root.unmount();
		},
	};
}
