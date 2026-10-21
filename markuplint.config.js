import { extendsConfig } from '@d-zero/markuplint-config';

const extended = extendsConfig({
	classNaming: ['/./'],
});

/**
 * @type {import('@markuplint/ml-config').Config}
 */
export default {
	...extended,
	excludeFiles: ['**/storybook-static/**'],
	parser: {
		...extended.parser,
		'\\.[jt]sx$': '@markuplint/jsx-parser',
	},
	specs: {
		'\\.[jt]sx$': '@markuplint/react-spec',
	},
	rules: {
		...extended.rules,
		'heading-levels': false,
	},
	nodeRules: [
		{
			// ReactのonDoubleClickをreact-specが未収載のため許可
			selector: 'button',
			rules: {
				'invalid-attr': {
					options: {
						allowAttrs: [{ name: 'onDoubleClick', value: 'Any' }],
					},
				},
			},
		},
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
			// defaultValue/defaultChecked: https://github.com/markuplint/markuplint/issues/2590
			// placeholder: type属性が動的（JSX式）だとreact-specが判定できず誤検出する
			selector: 'input',
			rules: {
				'invalid-attr': {
					options: {
						allowAttrs: ['defaultValue', 'defaultChecked', 'placeholder'],
					},
				},
			},
		},
	],
	overrides: {
		'packages/@burger-editor/blocks/src/items/carousel/template.html': {
			nodeRules: [
				{
					// SP画像の固定スロットになる<source>。srcsetを持たない<source>は
					// ブラウザが読み飛ばすので、SP画像が未設定の初期状態を安全に表せる。
					// ここにプレースホルダーのURLを入れると、mediaのない<source>が常に
					// 選ばれ、PC画像を上書きしてしまう。他のテンプレートには広げない
					selector: 'picture > source[data-bge]',
					rules: {
						'required-attr': false,
					},
				},
			],
		},
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
