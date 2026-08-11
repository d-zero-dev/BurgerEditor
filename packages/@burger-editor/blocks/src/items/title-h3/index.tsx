import { createItem } from '@burger-editor/core';

import style from './style.css';
import template from './template.html';

export default createItem<{
	titleH3: string;
}>({
	version: __VERSION__,
	name: 'title-h3',
	template,
	style,
	Editor({ state, setState }) {
		return (
			<input
				type="text"
				name="bge-title-h3"
				placeholder="見出しを入力してください"
				value={state.titleH3 ?? ''}
				onChange={(e) => setState({ ...state, titleH3: e.currentTarget.value })}
			/>
		);
	},
});
