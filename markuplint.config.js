import { extendsConfig } from '@d-zero/markuplint-config';

const extended = extendsConfig({
	classNaming: ['/./'],
});

/**
 * @type {import('@markuplint/ml-config').Config}
 */
export default {
	...extended,
	parser: {
		...extended.parser,
		'\\.svelte$': '@markuplint/svelte-parser',
	},
	specs: {
		'\\.svelte$': '@markuplint/svelte-spec',
	},
	nodeRules: [
		...extended.nodeRules,
		{
			// https://github.com/markuplint/markuplint/issues/673
			selector: '[role="radiogroup"]',
			rules: {
				'wai-aria': false,
			},
		},
		{
			// https://github.com/markuplint/markuplint/issues/2464
			selector: '.block-catalog dl, dt + div',
			rules: {
				'permitted-contents': false,
			},
		},
		{
			// https://github.com/markuplint/markuplint/issues/2590
			selector: 'input',
			rules: {
				'invalid-attr': {
					options: {
						allowAttrs: ['defaultValue', 'defaultChecked'],
					},
				},
			},
		},
	],
};
