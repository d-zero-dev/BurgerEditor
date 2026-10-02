import type { HrData } from './definition.js';
import type { ItemEditorProps } from '@burger-editor/core';

import { SelectField } from '@burger-editor/client/ui';

/**
 * hrアイテムのエディタ。区切り線の種類を編集する。
 *
 * createItemのオブジェクトメソッド省略記法（`Editor(props) {...}`）のまま
 * だとReact Compilerがコンポーネントとして認識しないため、名前付き
 * トップレベル関数として切り出し`Editor: HrEditor`で参照する。
 * @param root0
 * @param root0.state
 * @param root0.setState
 */
export function HrEditor({ state, setState }: ItemEditorProps<HrData>) {
	return (
		<div>
			<SelectField
				label="区切り線の種類"
				name="bge-kind"
				value={state.kind ?? 'primary'}
				onChange={(kind) => setState({ ...state, kind })}
				options={[
					{ value: 'primary', label: '標準' },
					{ value: 'dashed', label: '破線' },
					{ value: 'bold', label: '太い区切り線' },
					{ value: 'narrow', label: '細い区切り線' },
				]}
			/>
		</div>
	);
}
