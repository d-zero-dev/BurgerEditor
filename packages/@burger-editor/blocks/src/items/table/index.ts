import { htmlToMarkdown, markdownToHtml } from '@burger-editor/utils';

import { createItem } from '../../create-item.js';

import editor from './editor.html';
import style from './style.css';
import template from './template.html';

export default createItem<{
	caption: string;
	th: string[];
	td: string[];
}>({
	version: __VERSION__,
	name: 'table',
	template,
	style,
	editor,
	editorOptions: {
		beforeOpen(data) {
			return {
				...data,
				td: data.td.map(htmlToMarkdown),
			};
		},
		beforeChange(newData) {
			return {
				...newData,
				td: newData.td.map(markdownToHtml),
			};
		},
	},
});
