import type { TitleH2Data } from './definition.js';
import type { ItemEditorProps } from '@burger-editor/core';

/**
 * title-h2アイテムのエディタ。見出しテキストを編集する。
 *
 * createItemのオブジェクトメソッド省略記法（`Editor(props) {...}`）のまま
 * だとReact Compilerがコンポーネントとして認識しないため、名前付き
 * トップレベル関数として切り出し`Editor: TitleH2Editor`で参照する。
 * @param root0
 * @param root0.state
 * @param root0.setState
 */
export function TitleH2Editor({ state, setState }: ItemEditorProps<TitleH2Data>) {
	return (
		<input
			type="text"
			name="bge-title-h2"
			placeholder="見出しを入力してください"
			value={state.titleH2 ?? ''}
			onChange={(e) => setState({ ...state, titleH2: e.currentTarget.value })}
		/>
	);
}
