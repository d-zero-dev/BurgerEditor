import type { ContainerProps } from './types.js';

/**
 *
 * @param containerProps
 */
export function importContainerProps(containerProps?: ContainerProps): string {
	const {
		type,
		immutable,
		autoRepeat,
		justify,
		align,
		wrap,
		columns,
		float,
		frameSemantics,
	} = containerProps ?? {};
	const options = new Set<string>();
	if (immutable) {
		options.add('immutable');
	}

	if (autoRepeat === 'auto-fit') {
		options.add('auto-fit');
	} else if (autoRepeat === 'auto-fill') {
		options.add('auto-fill');
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
	if (frameSemantics && frameSemantics !== 'div') {
		options.add(frameSemantics);
	}

	const query = [type, ...options].join(':');

	return query;
}
