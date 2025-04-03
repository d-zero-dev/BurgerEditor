import { createItem } from '../../create-item.js';

import editor from './editor.html';
import style from './style.css';
import template from './template.html';

export default createItem<{
	link: string;
	target: '' | '_blank' | '_top' | '_self';
	text: string;
	kind: 'link' | 'em' | 'external' | 'back';
}>({
	version: __VERSION__,
	name: 'button',
	template,
	style,
	editor,
});
