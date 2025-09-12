import { createItem } from '../create-item.js';

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
});
