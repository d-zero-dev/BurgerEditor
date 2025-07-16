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
	rules: {
		...extended.rules,
		'heading-levels': false,
	},
	nodeRules: [
		...extended.nodeRules.filter((rule) => !rule.selector.startsWith('img')),
		{
			...extended.nodeRules.find((rule) => rule.selector.startsWith('img')),
			rules: {
				...extended.nodeRules.find((rule) => rule.selector.startsWith('img')).rules,
				// Disable https://github.com/d-zero-dev/linters/blob/dev/packages/%40d-zero/markuplint-config/base.js#L46-L57
				'invalid-attr': false,
			},
		},
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
	overrides: {
		'packages/@burger-editor/legacy/src/v3/**/*': {
			...extended,
			rules: {
				...extended.rules,
				'invalid-attr': false,
				'require-accessible-name': false,
			},
		},
	},
};
