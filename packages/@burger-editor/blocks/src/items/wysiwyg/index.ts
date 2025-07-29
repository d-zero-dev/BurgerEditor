import { createItem } from '../../create-item.js';

import editor from './editor.html';
import style from './style.css';
import template from './template.html';

export type WysiwygData = {
	wysiwyg: string;
};

export default createItem<WysiwygData>({
	version: __VERSION__,
	name: 'wysiwyg',
	template,
	style,
	editor,
});
