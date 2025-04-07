import type { ItemPrimitiveData } from '../item/types.js';

/**
 *
 * @param datum
 * @param isArray
 */
export function decodeItemPrimitiveData(
	datum: string,
	isArray: boolean,
): ItemPrimitiveData | ItemPrimitiveData[] {
	if (isArray) {
		const array = datum.split(',');
		return array.map((datum) => {
			const safeString = decodeURIComponent(datum.toWellFormed());
			return toLiteral(safeString);
		});
	}
	return toLiteral(datum.toWellFormed());
}

/**
 *
 * @param datum
 */
function toLiteral(datum: string): ItemPrimitiveData {
	try {
		return JSON.parse(datum);
	} catch {
		return datum;
	}
}
