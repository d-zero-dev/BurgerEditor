import type { ItemSeed } from '@burger-editor/core';

import { createItem } from '@burger-editor/core';

import style from './style.css';
import template from './template.html';

export type DetailsData = {
	open: boolean;
	summary: string;
	content: string;
};

/**
 * detailsアイテムの定義（Editorを含まない）。`index.tsx` がEditorを合成する。
 */
export const detailsDefinition: ItemSeed<string, DetailsData> = {
	version: __VERSION__,
	name: 'details',
	template,
	style,
};

export default createItem<DetailsData>(detailsDefinition);
