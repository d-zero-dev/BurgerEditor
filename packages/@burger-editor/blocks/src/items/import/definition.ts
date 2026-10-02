import type { ItemSeed } from '@burger-editor/core';

import { createItem } from '@burger-editor/core';

import style from './style.css';
import template from './template.html';

export type ImportData = {
	src: string;
};

/**
 * importアイテムの定義（Editorを含まない）。`index.tsx` がEditorを合成する。
 */
export const importDefinition: ItemSeed<string, ImportData> = {
	version: __VERSION__,
	name: 'import',
	template,
	style,
};

export default createItem<ImportData>(importDefinition);
