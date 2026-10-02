import type { ImportData } from './definition.js';
import type { ItemEditorProps } from '@burger-editor/core';

import { TextField } from '@burger-editor/client/ui';

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
export function ImportEditor({ state, setState }: ItemEditorProps<ImportData>) {
	return (
		<TextField
			label="読み込むHTMLファイルのパス"
			name="bge-src"
			value={state.src ?? ''}
			onChange={(src) => setState({ ...state, src })}
		/>
	);
}
