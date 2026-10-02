import type { ItemSeed } from '@burger-editor/core';

import { createItem } from '@burger-editor/core';
import { parseYTId } from '@burger-editor/utils';

import style from './style.css';
import template from './template.html';

const FALLBACK_TITLE = 'YouTube動画';
const THUMB_URL = '//img.youtube.com/vi/';
const THUMB_FILE_NAME = '/maxresdefault.jpg';

/**
 * 埋め込みURLの組み立て。エディタのプレビューと保存データの `url` が同じ
 * 値になるよう、定義とEditorで共有する。
 */
export const BASE_URL = '//www.youtube.com/embed/';
export const BASIC_PARAM = '?rel=0&loop=1&autoplay=1&autohide=1&start=0';

export type YoutubeData = {
	id: string;
	title: string;
	thumb: string;
	url: string;
};

/**
 * youtubeアイテムの定義（Editorを含まない）。`index.tsx` がEditorを合成する。
 */
export const youtubeDefinition: ItemSeed<string, YoutubeData> = {
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
};

export default createItem<YoutubeData>(youtubeDefinition);
