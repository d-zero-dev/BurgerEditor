import { createItem } from '@burger-editor/core';

import style from './style.css';
import template from './template.html';

export default createItem<{
	titleH2: string;
}>({
	version: __VERSION__,
	name: 'title-h2',
	template,
	style,
	Editor({ state, setState }) {
		return (
			<input
				type="text"
				name="bge-title-h2"
				placeholder="見出しを入力してください"
				value={state.titleH2 ?? ''}
				onChange={(e) => setState({ ...state, titleH2: e.currentTarget.value })}
			/>
		);
	},
});
