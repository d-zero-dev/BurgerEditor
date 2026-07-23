import { SelectField } from '@burger-editor/client/react';
import { createItem } from '@burger-editor/core';

import style from './style.css';
import template from './template.html';

export default createItem<{
	kind: string;
}>({
	version: __VERSION__,
	name: 'hr',
	template,
	style,
	Editor({ state, setState }) {
		return (
			<div>
				<SelectField
					label="区切り線の種類"
					name="bge-kind"
					value={state.kind ?? 'primary'}
					onChange={(kind) => setState({ ...state, kind })}
					options={[
						{ value: 'primary', label: '標準' },
						{ value: 'dashed', label: '破線' },
						{ value: 'bold', label: '太い区切り線' },
						{ value: 'narrow', label: '細い区切り線' },
					]}
				/>
			</div>
		);
	},
});
