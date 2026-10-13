import type { WysiwygData } from './definition.js';
import type { ItemEditorProps } from '@burger-editor/core';

import { WysiwygField } from '@burger-editor/client/ui';

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
export function WysiwygEditor({ state, setState }: ItemEditorProps<WysiwygData>) {
	return (
		<WysiwygField
			itemName="wysiwyg"
			value={state.wysiwyg ?? ''}
			onChange={(wysiwyg) => setState({ ...state, wysiwyg })}
		/>
	);
}
