import type { ItemSeed } from '@burger-editor/core';

import { createItem } from '@burger-editor/core';

import style from './style.css';
import template from './template.html';

export type WysiwygData = {
	wysiwyg: string;
};

/**
 * wysiwygアイテムの定義（Editorを含まない）。`index.tsx` がEditorを合成する。
 */
export const wysiwygDefinition: ItemSeed<string, WysiwygData> = {
	version: __VERSION__,
	name: 'wysiwyg',
	template,
	style,
};

export default createItem<WysiwygData>(wysiwygDefinition);
