import config from '@d-zero/prettier-config/base';

/**
 * @type {import('prettier').Options}
 */
export default {
	...config,
	plugins: [...(config.plugins ?? []), 'prettier-plugin-svelte'],
	overrides: [
		...config.overrides,
		{
			files: '*.svelte',
			options: {
				parser: 'svelte',
			},
		},
	],
};
