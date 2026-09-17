import type { ItemEditorProps } from '@burger-editor/core';

import { Checkbox, TableEditor, TextField } from '@burger-editor/client/ui';
import { createItem } from '@burger-editor/core';
import { htmlToMarkdown, markdownToHtml } from '@burger-editor/utils';

import style from './style.css';
import template from './template.html';

export type TableData = {
	caption: string;
	th: string[];
	td: string[];
	scrollable: boolean;
};

/**
 * tableアイテムのエディタ。見出し・横スクロール可否・表本体を編集する。
 *
 * createItemのオブジェクトメソッド省略記法（`Editor(props) {...}`）のまま
 * だとReact Compilerがコンポーネントとして認識しないため、名前付き
 * トップレベル関数として切り出し`Editor: TableItemEditor`で参照する。
 * @param root0
 * @param root0.state
 * @param root0.setState
 */
function TableItemEditor({ state, setState }: ItemEditorProps<TableData>) {
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
}

export default createItem<TableData>({
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
	Editor: TableItemEditor,
});
