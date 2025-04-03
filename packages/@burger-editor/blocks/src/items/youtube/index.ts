import { parseYTId } from '@burger-editor/utils';

import { createItem } from '../../create-item.js';

import editor from './editor.html';
import style from './style.css';
import template from './template.html';

const FALLBACK_TITLE = 'YouTube動画';

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
	editor,
	editorOptions: {
		open({ title }, editor) {
			editor.update('$title', (value) => {
				if (title === FALLBACK_TITLE) {
					return '';
				}
				return value;
			});

			const BASE_URL = '//www.youtube.com/embed/';
			const BASIC_PARAM = '?rel=0&loop=1&autoplay=1&autohide=1&start=0';
			const THUMB_URL = '//img.youtube.com/vi/';
			const THUMB_FILE_NAME = '/maxresdefault.jpg';
			const $id = editor.find<HTMLInputElement>('[name="bge-id"]');
			const $preview = editor.find<HTMLIFrameElement>('.bge-youtube-preview');
			const preview = () => {
				const id = parseYTId($id?.value ?? '');
				const url = BASE_URL + id + BASIC_PARAM;
				$preview?.setAttribute('src', url);
				editor.update('$url', url);
				editor.update('$thumb', THUMB_URL + id + THUMB_FILE_NAME);
			};
			$id?.addEventListener('change', preview);
			$id?.addEventListener('input', preview);
			preview();
		},
		beforeChange(newData) {
			return {
				...newData,
				id: parseYTId(newData.id),
				title: newData.title || FALLBACK_TITLE,
			};
		},
	},
});
