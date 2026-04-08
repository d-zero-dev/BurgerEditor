import type { ContainerProps } from './types.js';

/**
 *
 * @param containerProps
 */
export function importContainerProps(containerProps?: Partial<ContainerProps>): string {
	const {
		type = 'inline',
		immutable = false,
		autoRepeat = 'fixed',
		justify = null,
		align = null,
		wrap = null,
		columns = null,
		float = null,
		frameSemantics = 'div',
		repeatMinInlineSize = null,
	}: Partial<ContainerProps> = containerProps ?? {};
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
	if (columns && autoRepeat === 'fixed') {
		options.add(columns.toString());
	}
	if (float) {
		options.add(float);
	}
	if (frameSemantics && frameSemantics !== 'div') {
		options.add(frameSemantics);
	}
	if (repeatMinInlineSize) {
		options.add(`--${repeatMinInlineSize}`);
	}

	const query = [type, ...options].join(':');

	return query;
}
