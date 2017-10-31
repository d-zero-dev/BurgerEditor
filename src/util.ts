/**
 *
 */
export function arrayToHash<T, K extends string> (kvs: [K, T, boolean][]) {
	const result = {} as {[P in K]: T | T[]};
	kvs.forEach((kv) => {
		const k = kv[0];
		const v = kv[1];
		const toArray = kv[2];
		if (toArray) {
			const alv = result[k];
			if (Array.isArray(alv)) {
				alv.push(v);
			} else {
				result[k] = k in result ? [alv, v] : [v];
			}
		} else {
			result[k] = v;
		}
	});
	return result;
}
