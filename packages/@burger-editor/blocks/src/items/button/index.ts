import type { SelectableValue } from '@burger-editor/core';

import { mergeItems } from '@burger-editor/utils';

import { createItem } from '../create-item.js';

import editor from './editor.html';
import style from './style.css';
import template from './template.html';

export default createItem<{
	link: string;
	target: '' | '_blank' | '_top' | '_self';
	text: string;
	subtext: string;
	kind: string;
	beforeIcon: string;
	afterIcon: string;
}>({
	version: __VERSION__,
	name: 'button',
	template,
	style,
	editor,
	editorOptions: {
		beforeOpen(data, editor) {
			const kindOptions = mergeOptions(
				[
					{ value: 'primary', label: 'プライマリボタン' },
					{ value: 'secondary', label: 'セカンダリボタン' },
					{ value: 'tertiary', label: 'ターシャリボタン' },
					{ value: 'text', label: 'テキストリンク' },
				],
				editor.engine.config.experimental?.itemOptions?.button?.kinds,
			);

			const beforeIconOptions = mergeOptions(
				[
					{ value: 'none', label: 'なし' },
					{ value: 'arrow-left', label: '左矢印' },
				],
				editor.engine.config.experimental?.itemOptions?.button?.beforeIcons,
			);

			const afterIconOptions = mergeOptions(
				[
					{ value: 'none', label: 'なし' },
					{ value: 'arrow-right', label: '右矢印' },
					{ value: 'arrow-down', label: '下矢印' },
					{ value: 'external', label: '別タブ' },
					{ value: 'text-file', label: 'ファイル' },
				],
				editor.engine.config.experimental?.itemOptions?.button?.afterIcons,
			);

			editor.setOptions('bge-kind', kindOptions);
			editor.setOptions('bge-before-icon', beforeIconOptions);
			editor.setOptions('bge-after-icon', afterIconOptions);

			return data;
		},
	},
});

/**
 *
 * @param defaultOptions
 * @param configOptions
 */
function mergeOptions(
	defaultOptions: readonly SelectableValue[],
	configOptions: readonly SelectableValue[] = [],
) {
	return mergeItems(defaultOptions, configOptions, 'value', (item) =>
		Boolean(item.label),
	);
}
