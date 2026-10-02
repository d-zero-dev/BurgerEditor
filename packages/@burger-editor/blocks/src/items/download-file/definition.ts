import type { ItemSeed } from '@burger-editor/core';

import { createItem } from '@burger-editor/core';

import style from './style.css';
import template from './template.html';

export type DownloadFileData = {
	path: string;
	download: string;
	name: string;
	formatedSize: string;
	size: string;
	downloadCheck: boolean;
};

/**
 * download-fileアイテムの定義（Editorを含まない）。`index.tsx` がEditorを合成する。
 */
export const downloadFileDefinition: ItemSeed<string, DownloadFileData> = {
	version: __VERSION__,
	name: 'download-file',
	template,
	style,
	toEditorState(data) {
		return {
			...data,
			downloadCheck: !!data.download,
		};
	},
	toItemData(state) {
		return {
			...state,
			download: state.downloadCheck ? (state.name ?? state.path) : '',
		};
	},
};

export default createItem<DownloadFileData>(downloadFileDefinition);
