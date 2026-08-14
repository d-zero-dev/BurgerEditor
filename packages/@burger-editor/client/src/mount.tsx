import type { ReactNode } from 'react';

import { createRoot } from 'react-dom/client';

/**
 * Mount a React node into a DOM container and return a `Disposable`
 * teardown handle, matching the `UICreator` contract shape used across
 * the engine.
 * @param node - The React node to render
 * @param target - The DOM container
 * @returns A handle that unmounts the root, via `using` or `cleanUp()`
 * @example
 * ```tsx
 * using mount = reactMount(<DraftSwitcher engine={engine} />, container);
 * // Root is unmounted automatically when `mount` goes out of scope.
 * ```
 */
export function reactMount(
	node: ReactNode,
	target: HTMLElement,
): Disposable & {
	/** @deprecated Use a `using` declaration instead. */
	cleanUp(): void;
} {
	const root = createRoot(target);
	root.render(node);
	const teardown = () => {
		root.unmount();
	};
	// cleanUpと[Symbol.dispose]は同じ関数を指す — thisに依存する実装だと
	// `const { cleanUp } = reactMount(...)` のような分割代入経由の呼び出しで
	// thisが外れてTypeErrorになるため、共有クロージャへの参照にしている
	return {
		cleanUp: teardown,
		[Symbol.dispose]: teardown,
	};
}
