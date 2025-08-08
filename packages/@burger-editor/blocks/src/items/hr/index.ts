import { createItem } from '../../create-item.js';

import editor from './editor.html';
import style from './style.css';
import template from './template.html';

export default createItem<{
	kind: string;
}>({
	version: __VERSION__,
	name: 'hr',
	template,
	style,
	editor,
});
