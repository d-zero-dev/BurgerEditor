import type { ItemSeed } from '@burger-editor/core';

import { createItem } from '@burger-editor/core';

import style from './style.css';
import template from './template.html';

export type HrData = {
	kind: string;
};

/**
 * hrアイテムの定義（Editorを含まない）。`index.tsx` がEditorを合成する。
 */
export const hrDefinition: ItemSeed<string, HrData> = {
	version: __VERSION__,
	name: 'hr',
	template,
	style,
};

export default createItem<HrData>(hrDefinition);
