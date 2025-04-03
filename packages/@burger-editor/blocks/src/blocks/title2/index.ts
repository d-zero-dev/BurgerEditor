import type { BlockTemplate } from '@burger-editor/core';

import { importItems } from '../../import-items.js';

import icon from './icon.svg';
import template from './template.html';

const blockTemplate = {
	name: 'title2',
	template: importItems(template),
	icon,
} as const satisfies BlockTemplate;

export default blockTemplate;
