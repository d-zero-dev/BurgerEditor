import { Checkbox, TextField, WysiwygField } from '@burger-editor/client/ui';
import { createItem } from '@burger-editor/core';

import style from './style.css';
import template from './template.html';

export type DetailsData = {
	open: boolean;
	summary: string;
	content: string;
};

export default createItem<DetailsData>({
	version: __VERSION__,
	name: 'details',
	template,
	style,
	Editor({ state, setState }) {
		return (
			<>
				<Checkbox
					name="bge-open"
					label={<span>開いた状態で公開する</span>}
					checked={state.open ?? false}
					onChange={(open) => setState({ ...state, open })}
				/>
				<TextField
					label="概要"
					name="bge-summary"
					value={state.summary ?? ''}
					onChange={(summary) => setState({ ...state, summary })}
				/>
				<WysiwygField
					itemName="details"
					commands="bold,italic,underline,strikethrough,link,blockquote,bullet-list,ordered-list"
					value={state.content ?? ''}
					onChange={(content) => setState({ ...state, content })}
				/>
			</>
		);
	},
});
