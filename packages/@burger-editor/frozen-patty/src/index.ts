import type { FrozenPattyOptions } from './frozen-patty.js';

import FrozenPatty from './frozen-patty.js';

/**
 * Pure HTML to JSON converter that not use template engine.
 *
 * @param html Original HTML
 * @param options Options
 */

export default function frozenPatty(html: string, options?: FrozenPattyOptions) {
	return new FrozenPatty(html, options);
}
