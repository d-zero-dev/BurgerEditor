import type { TableData } from './definition.js';
import type { ItemEditorProps } from '@burger-editor/core';

import { Checkbox, TableEditor, TextField } from '@burger-editor/client/ui';

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
export function TableItemEditor({ state, setState }: ItemEditorProps<TableData>) {
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
