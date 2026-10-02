import type { ItemSeed } from '@burger-editor/core';

import { createItem } from '@burger-editor/core';

import style from './style.css';
import template from './template.html';

export type TitleH3Data = {
	titleH3: string;
};

/**
 * title-h3アイテムの定義（Editorを含まない）。`index.tsx` がEditorを合成する。
 */
export const titleH3Definition: ItemSeed<string, TitleH3Data> = {
	version: __VERSION__,
	name: 'title-h3',
	template,
	style,
};

export default createItem<TitleH3Data>(titleH3Definition);
