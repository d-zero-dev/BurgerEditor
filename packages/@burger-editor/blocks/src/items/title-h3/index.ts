import { createItem } from '../../create-item.js';

import editor from './editor.html';
import style from './style.css';
import template from './template.html';

export default createItem({
	version: __VERSION__,
	name: 'title-h3',
	template,
	style,
	editor,
});
