import type { TitleH3Data } from './definition.js';
import type { ItemEditorProps } from '@burger-editor/core';

/**
 * title-h3アイテムのエディタ。見出しテキストを編集する。
 *
 * createItemのオブジェクトメソッド省略記法（`Editor(props) {...}`）のまま
 * だとReact Compilerがコンポーネントとして認識しないため、名前付き
 * トップレベル関数として切り出し`Editor: TitleH3Editor`で参照する。
 * @param root0
 * @param root0.state
 * @param root0.setState
 */
export function TitleH3Editor({ state, setState }: ItemEditorProps<TitleH3Data>) {
	return (
		<input
			type="text"
			name="bge-title-h3"
			placeholder="見出しを入力してください"
			value={state.titleH3 ?? ''}
			onChange={(e) => setState({ ...state, titleH3: e.currentTarget.value })}
		/>
	);
}
