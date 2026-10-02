import type { YoutubeData } from './definition.js';
import type { ItemEditorProps } from '@burger-editor/core';

import { TextField } from '@burger-editor/client/ui';
import { parseYTId } from '@burger-editor/utils';

import { BASE_URL, BASIC_PARAM } from './definition.js';

/**
 * youtubeアイテムのエディタ。埋め込み動画ID・タイトルを編集する。
 *
 * createItemのオブジェクトメソッド省略記法（`Editor(props) {...}`）のまま
 * だとReact Compilerがコンポーネントとして認識しないため、名前付き
 * トップレベル関数として切り出し`Editor: YoutubeEditor`で参照する。
 * @param root0
 * @param root0.state
 * @param root0.setState
 */
export function YoutubeEditor({ state, setState }: ItemEditorProps<YoutubeData>) {
	const previewUrl = BASE_URL + parseYTId(state.id ?? '') + BASIC_PARAM;
	return (
		<>
			<div>
				<iframe
					className="bge-youtube-preview"
					title="YouTubeプレビュー"
					loading="lazy"
					style={{ aspectRatio: '16 / 9' }}
					src={previewUrl}></iframe>
			</div>

			<div>
				<TextField
					label="URLもしくは動画ID"
					name="bge-id"
					value={state.id ?? ''}
					onChange={(id) => setState({ ...state, id })}
				/>
				<TextField
					label="動画タイトル"
					name="bge-title"
					value={state.title ?? ''}
					onChange={(title) => setState({ ...state, title })}
				/>
			</div>
		</>
	);
}
