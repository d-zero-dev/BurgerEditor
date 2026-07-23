import { WysiwygField } from '@burger-editor/client/react';
import { createItem } from '@burger-editor/core';

import style from './style.css';
import template from './template.html';

export type WysiwygData = {
	wysiwyg: string;
};

export default createItem<WysiwygData>({
	version: __VERSION__,
	name: 'wysiwyg',
	template,
	style,
	Editor({ state, setState }) {
		return (
			<WysiwygField
				itemName="wysiwyg"
				value={state.wysiwyg ?? ''}
				onChange={(wysiwyg) => setState({ ...state, wysiwyg })}
			/>
		);
	},
});
