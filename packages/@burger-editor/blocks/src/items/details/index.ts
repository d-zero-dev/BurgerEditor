import type { BgeWysiwygEditorElement } from '@burger-editor/custom-element';

import { createItem } from '../../create-item.js';

import editor from './editor.html';
import style from './style.css';
import template from './template.html';

export type DetailsData = {
	open: boolean;
	summary: string;
	content: string;
};

export default createItem<DetailsData>({
	version: __VERSION__,
	name: 'details',
	template,
	style,
	editor,
	editorOptions: {
		async open(_, editor) {
			const css = await Promise.all(
				editor.engine.css.stylesheets
					.filter((sheet) => sheet.layer == null)
					.map(async (sheet) => {
						const res = await fetch(sheet.path);
						return res.text();
					}),
			);

			const wysiwyg = editor.find<BgeWysiwygEditorElement>('bge-wysiwyg-editor');
			wysiwyg?.setStyle(css.join('\n'));
		},
	},
});
