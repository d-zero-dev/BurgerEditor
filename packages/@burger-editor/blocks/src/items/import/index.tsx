import type { ItemEditorProps } from '@burger-editor/core';

import { TextField } from '@burger-editor/client/ui';
import { createItem } from '@burger-editor/core';

import style from './style.css';
import template from './template.html';

export type ImportData = {
	src: string;
};

/**
 * importアイテムのエディタ。読み込むHTMLファイルのパスを編集する。
 *
 * createItemのオブジェクトメソッド省略記法（`Editor(props) {...}`）のまま
 * だとReact Compilerがコンポーネントとして認識しないため、名前付き
 * トップレベル関数として切り出し`Editor: ImportEditor`で参照する。
 * @param root0
 * @param root0.state
 * @param root0.setState
 */
function ImportEditor({ state, setState }: ItemEditorProps<ImportData>) {
	return (
		<TextField
			label="読み込むHTMLファイルのパス"
			name="bge-src"
			value={state.src ?? ''}
			onChange={(src) => setState({ ...state, src })}
		/>
	);
}

export default createItem<ImportData>({
	version: __VERSION__,
	name: 'import',
	template,
	style,
	Editor: ImportEditor,
});
