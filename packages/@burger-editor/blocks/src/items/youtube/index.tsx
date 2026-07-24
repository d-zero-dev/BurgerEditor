import { TextField } from '@burger-editor/client/ui';
import { createItem } from '@burger-editor/core';
import { parseYTId } from '@burger-editor/utils';

import style from './style.css';
import template from './template.html';

const FALLBACK_TITLE = 'YouTube動画';
const BASE_URL = '//www.youtube.com/embed/';
const BASIC_PARAM = '?rel=0&loop=1&autoplay=1&autohide=1&start=0';
const THUMB_URL = '//img.youtube.com/vi/';
const THUMB_FILE_NAME = '/maxresdefault.jpg';

export default createItem<{
	id: string;
	title: string;
	thumb: string;
	url: string;
}>({
	version: __VERSION__,
	name: 'youtube',
	template,
	style,
	toEditorState(data) {
		return {
			...data,
			title: data.title === FALLBACK_TITLE ? '' : (data.title ?? ''),
		};
	},
	toItemData(state) {
		const id = parseYTId(state.id ?? '');
		return {
			...state,
			id,
			title: state.title || FALLBACK_TITLE,
			url: BASE_URL + id + BASIC_PARAM,
			thumb: THUMB_URL + id + THUMB_FILE_NAME,
		};
	},
	Editor({ state, setState }) {
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
	},
});
