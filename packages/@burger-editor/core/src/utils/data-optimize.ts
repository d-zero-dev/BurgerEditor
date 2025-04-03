import type { ItemMataData, ItemPrimitiveData } from '../item/types.js';

import { arrayToHash } from '@burger-editor/frozen-patty/utils';

/**
 *
 * @param raws
 */
export function dataOptimize(raws: readonly ItemMataData[]) {
	const a = raws.map(
		(r) => [r.key, r.datum, r.isArray] as [string, ItemPrimitiveData, boolean],
	);
	return arrayToHash(a);
}
