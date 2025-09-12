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
}>({
	version: __VERSION__,
	name: 'button',
	template,
	style,
	editor,
	editorOptions: {
		beforeOpen(data, editor) {
			// デフォルトのkind選択肢
			const defaultKindOptions: SelectableValue[] = [
				{ value: 'link', label: 'リンク' },
				{ value: 'em', label: '強調リンク' },
				{ value: 'external', label: '外部リンク' },
				{ value: 'in-page', label: 'ページ内リンク' },
				{ value: 'text', label: 'テキストリンク' },
				{ value: 'back', label: '戻る' },
			];

			// configからkind選択肢をマージ
			const configKinds = editor.engine.config.experimental?.itemOptions?.button?.kinds;
			const kindOptions = mergeItems(defaultKindOptions, configKinds, 'value', (item) =>
				Boolean(item.label),
			);

			// kind selectボックスをクリアして再構築
			const kindSelect = editor.find<HTMLSelectElement>('select[name="bge-kind"]');
			if (kindSelect) {
				kindSelect.innerHTML = '';
				for (const option of kindOptions) {
					const optionElement = kindSelect.ownerDocument.createElement('option');
					optionElement.value = option.value;
					optionElement.textContent = option.label;
					kindSelect.append(optionElement);
				}
			}

			return data;
		},
	},
});
