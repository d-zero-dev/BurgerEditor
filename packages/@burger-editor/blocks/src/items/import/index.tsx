import { TextField } from '@burger-editor/client/ui';
import { createItem } from '@burger-editor/core';

import style from './style.css';
import template from './template.html';

export default createItem<{
	src: string;
}>({
	version: __VERSION__,
	name: 'import',
	template,
	style,
	Editor({ state, setState }) {
		return (
			<TextField
				label="読み込むHTMLファイルのパス"
				name="bge-src"
				value={state.src ?? ''}
				onChange={(src) => setState({ ...state, src })}
			/>
		);
	},
});
