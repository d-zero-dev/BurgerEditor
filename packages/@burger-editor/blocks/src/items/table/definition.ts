import type { ItemSeed } from '@burger-editor/core';

import { createItem } from '@burger-editor/core';
import { htmlToMarkdown, markdownToHtml } from '@burger-editor/utils';

import style from './style.css';
import template from './template.html';

export type TableData = {
	caption: string;
	th: string[];
	td: string[];
	scrollable: boolean;
};

/**
 * tableアイテムの定義（Editorを含まない）。`index.tsx` がEditorを合成する。
 */
export const tableDefinition: ItemSeed<string, TableData> = {
	version: __VERSION__,
	name: 'table',
	template,
	style,
	toEditorState(data) {
		return {
			...data,
			td: (data.td ?? []).map(htmlToMarkdown),
		};
	},
	toItemData(state) {
		return {
			...state,
			td: state.td.map(markdownToHtml),
		};
	},
};

export default createItem<TableData>(tableDefinition);
