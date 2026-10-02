import type { DetailsData } from './definition.js';
import type { ItemEditorProps } from '@burger-editor/core';

import { Checkbox, TextField, WysiwygField } from '@burger-editor/client/ui';

/**
 * detailsアイテムのエディタ。開閉初期状態・概要・本文を編集する。
 *
 * createItemのオブジェクトメソッド省略記法（`Editor(props) {...}`）のまま
 * だとReact Compilerがコンポーネントとして認識しないため、名前付き
 * トップレベル関数として切り出し`Editor: DetailsEditor`で参照する。
 * @param root0
 * @param root0.state
 * @param root0.setState
 */
export function DetailsEditor({ state, setState }: ItemEditorProps<DetailsData>) {
	return (
		<>
			<Checkbox
				name="bge-open"
				label={<span>開いた状態で公開する</span>}
				checked={state.open ?? false}
				onChange={(open) => setState({ ...state, open })}
			/>
			<TextField
				label="概要"
				name="bge-summary"
				value={state.summary ?? ''}
				onChange={(summary) => setState({ ...state, summary })}
			/>
			<WysiwygField
				itemName="details"
				commands="bold,italic,underline,strikethrough,link,blockquote,bullet-list,ordered-list"
				value={state.content ?? ''}
				onChange={(content) => setState({ ...state, content })}
			/>
		</>
	);
}
