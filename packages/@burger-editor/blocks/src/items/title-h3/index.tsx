import type { ItemEditorProps } from '@burger-editor/core';

import { createItem } from '@burger-editor/core';

import style from './style.css';
import template from './template.html';

export type TitleH3Data = {
	titleH3: string;
};

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
function TitleH3Editor({ state, setState }: ItemEditorProps<TitleH3Data>) {
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

export default createItem<TitleH3Data>({
	version: __VERSION__,
	name: 'title-h3',
	template,
	style,
	Editor: TitleH3Editor,
});
