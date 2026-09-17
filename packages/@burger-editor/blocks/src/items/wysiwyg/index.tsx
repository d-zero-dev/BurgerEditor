import type { ItemEditorProps } from '@burger-editor/core';

import { WysiwygField } from '@burger-editor/client/ui';
import { createItem } from '@burger-editor/core';

import style from './style.css';
import template from './template.html';

export type WysiwygData = {
	wysiwyg: string;
};

/**
 * wysiwygアイテムのエディタ。リッチテキスト本文を編集する。
 *
 * createItemのオブジェクトメソッド省略記法（`Editor(props) {...}`）のまま
 * だとReact Compilerがコンポーネントとして認識しないため、名前付き
 * トップレベル関数として切り出し`Editor: WysiwygEditor`で参照する。
 * @param root0
 * @param root0.state
 * @param root0.setState
 */
function WysiwygEditor({ state, setState }: ItemEditorProps<WysiwygData>) {
	return (
		<WysiwygField
			itemName="wysiwyg"
			value={state.wysiwyg ?? ''}
			onChange={(wysiwyg) => setState({ ...state, wysiwyg })}
		/>
	);
}

export default createItem<WysiwygData>({
	version: __VERSION__,
	name: 'wysiwyg',
	template,
	style,
	Editor: WysiwygEditor,
});
