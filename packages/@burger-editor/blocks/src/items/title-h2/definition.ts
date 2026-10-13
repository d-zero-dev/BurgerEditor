import type { ItemSeed } from '@burger-editor/core';

import { createItem } from '@burger-editor/core';

import style from './style.css';
import template from './template.html';

export type TitleH2Data = {
	titleH2: string;
};

/**
 * title-h2アイテムの定義（Editorを含まない）。`index.tsx` がEditorを合成する。
 */
export const titleH2Definition: ItemSeed<string, TitleH2Data> = {
	version: __VERSION__,
	name: 'title-h2',
	template,
	style,
};

export default createItem<TitleH2Data>(titleH2Definition);
