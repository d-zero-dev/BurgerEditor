import type { ItemSeed } from '@burger-editor/core';

import { createItem } from '@burger-editor/core';

import style from './style.css';
import template from './template.html';

export type ButtonData = {
	link: string;
	target: '' | '_blank' | '_top' | '_self';
	text: string;
	subtext: string;
	kind: string;
	beforeIcon: string;
	afterIcon: string;
};

/**
 * buttonアイテムの定義（Editorを含まない）。`index.tsx` がEditorを合成する。
 */
export const buttonDefinition: ItemSeed<string, ButtonData> = {
	version: __VERSION__,
	name: 'button',
	template,
	style,
};

export default createItem<ButtonData>(buttonDefinition);
