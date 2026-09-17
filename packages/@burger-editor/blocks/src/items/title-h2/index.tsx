import type { ItemEditorProps } from '@burger-editor/core';

import { createItem } from '@burger-editor/core';

import style from './style.css';
import template from './template.html';

export type TitleH2Data = {
	titleH2: string;
};

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
function TitleH2Editor({ state, setState }: ItemEditorProps<TitleH2Data>) {
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

export default createItem<TitleH2Data>({
	version: __VERSION__,
	name: 'title-h2',
	template,
	style,
	Editor: TitleH2Editor,
});
