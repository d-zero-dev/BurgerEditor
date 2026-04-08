import { createItem } from '@burger-editor/core';

import editor from './editor.html';
import style from './style.css';
import template from './template.html';

export default createItem<{
	id: string;
	title: string;
	thumb: string;
	url: string;
}>({
	version: __VERSION__,
	name: 'import',
	template,
	style,
	editor,
});
