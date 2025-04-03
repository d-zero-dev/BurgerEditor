import type { ContainerProps } from './types.js';

/**
 *
 * @param containerProps
 */
export function importContainerProps(containerProps?: ContainerProps): string {
	const { type, immutable, justify, align, wrap, columns, float } = containerProps ?? {};
	const options = new Set<string>();
	if (immutable) {
		options.add('immutable');
	}
	if (justify) {
		options.add(justify);
	}
	if (align) {
		options.add(align);
	}
	if (wrap) {
		options.add(wrap);
	}
	if (columns) {
		options.add(columns.toString());
	}
	if (float) {
		options.add(float);
	}

	const query = [type, ...options].join(':');

	return query;
}
