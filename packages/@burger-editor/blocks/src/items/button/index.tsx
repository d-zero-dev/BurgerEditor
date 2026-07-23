import type { SelectableValue } from '@burger-editor/core';

import { Fieldset, SelectField, TextField } from '@burger-editor/client/react';
import { createItem } from '@burger-editor/core';
import { mergeItems } from '@burger-editor/utils';

import style from './style.css';
import template from './template.html';

export default createItem<{
	link: string;
	target: '' | '_blank' | '_top' | '_self';
	text: string;
	subtext: string;
	kind: string;
	beforeIcon: string;
	afterIcon: string;
}>({
	version: __VERSION__,
	name: 'button',
	template,
	style,
	Editor({ state, setState, config }) {
		const kindOptions = mergeOptions(
			[
				{ value: 'primary', label: 'プライマリボタン' },
				{ value: 'secondary', label: 'セカンダリボタン' },
				{ value: 'tertiary', label: 'ターシャリボタン' },
				{ value: 'text', label: 'テキストリンク' },
			],
			config.experimental?.itemOptions?.button?.kinds,
		);

		const beforeIconOptions = mergeOptions(
			[
				{ value: 'none', label: 'なし' },
				{ value: 'arrow-left', label: '左矢印' },
			],
			config.experimental?.itemOptions?.button?.beforeIcons,
		);

		const afterIconOptions = mergeOptions(
			[
				{ value: 'none', label: 'なし' },
				{ value: 'arrow-right', label: '右矢印' },
				{ value: 'arrow-down', label: '下矢印' },
				{ value: 'external', label: '別タブ' },
				{ value: 'text-file', label: 'ファイル' },
			],
			config.experimental?.itemOptions?.button?.afterIcons,
		);

		return (
			<div>
				<Fieldset legend="リンク">
					<TextField
						label="URL"
						name="bge-link"
						value={state.link ?? ''}
						onChange={(link) => setState({ ...state, link })}
					/>
					<SelectField
						label="ターゲット"
						name="bge-target"
						value={state.target ?? ''}
						onChange={(target) =>
							setState({ ...state, target: target as typeof state.target })
						}
						options={[
							{ value: '', label: '指定なし' },
							{ value: '_blank', label: '新しいウィンドウ(_blank)' },
							{ value: '_top', label: '最上部ウィンドウ(_top)' },
							{ value: '_self', label: '同じウィンドウ(_self)' },
						]}
					/>
				</Fieldset>
				<TextField
					label="テキスト"
					name="bge-text"
					value={state.text ?? ''}
					onChange={(text) => setState({ ...state, text })}
				/>
				<TextField
					label="サブテキスト"
					name="bge-subtext"
					value={state.subtext ?? ''}
					onChange={(subtext) => setState({ ...state, subtext })}
				/>
				<SelectField
					label="ボタンのスタイル"
					name="bge-kind"
					value={state.kind ?? 'primary'}
					onChange={(kind) => setState({ ...state, kind })}
					options={kindOptions}
				/>
				<Fieldset legend="アイコン">
					<SelectField
						label="前"
						name="bge-before-icon"
						value={state.beforeIcon ?? 'none'}
						onChange={(beforeIcon) => setState({ ...state, beforeIcon })}
						options={beforeIconOptions}
					/>
					<SelectField
						label="後"
						name="bge-after-icon"
						value={state.afterIcon ?? 'none'}
						onChange={(afterIcon) => setState({ ...state, afterIcon })}
						options={afterIconOptions}
					/>
				</Fieldset>
			</div>
		);
	},
});

/**
 *
 * @param defaultOptions
 * @param configOptions
 */
function mergeOptions(
	defaultOptions: readonly SelectableValue[],
	configOptions: readonly SelectableValue[] = [],
) {
	return mergeItems(defaultOptions, configOptions, 'value', (item) =>
		Boolean(item.label),
	);
}
