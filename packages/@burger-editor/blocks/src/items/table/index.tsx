import { Checkbox, TableEditor, TextField } from '@burger-editor/client/react';
import { createItem } from '@burger-editor/core';
import { htmlToMarkdown, markdownToHtml } from '@burger-editor/utils';

import style from './style.css';
import template from './template.html';

export default createItem<{
	caption: string;
	th: string[];
	td: string[];
	scrollable: boolean;
}>({
	version: __VERSION__,
	name: 'table',
	template,
	style,
	toEditorState(data) {
		return {
			...data,
			td: (data.td ?? []).map(htmlToMarkdown),
		};
	},
	toItemData(state) {
		return {
			...state,
			td: state.td.map(markdownToHtml),
		};
	},
	Editor({ state, setState }) {
		return (
			<div data-bge-dialog="wide">
				<div>
					<Checkbox
						name="bge-scrollable"
						label={<span>横スクロール可能</span>}
						checked={state.scrollable ?? false}
						onChange={(scrollable) => setState({ ...state, scrollable })}
					/>
				</div>

				<div>
					<TextField
						label="表見出し"
						name="bge-caption"
						value={state.caption ?? ''}
						onChange={(caption) => setState({ ...state, caption })}
					/>
				</div>

				<TableEditor
					value={{ th: state.th ?? [], td: state.td ?? [] }}
					onChange={({ th, td }) => setState({ ...state, th: [...th], td: [...td] })}
				/>
			</div>
		);
	},
});
