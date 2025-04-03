import { formatByteSize } from '@burger-editor/utils';

import { createItem } from '../../create-item.js';

import editor from './editor.html';
import style from './style.css';
import template from './template.html';

export default createItem<{
	path: string;
	download: string;
	name: string;
	formatedSize: string;
	size: string;
	downloadCheck: boolean;
}>({
	version: __VERSION__,
	name: 'download-file',
	template,
	style,
	editor,
	editorOptions: {
		open(data, editor) {
			editor.engine.componentObserver.notify('file-select', {
				path: data.path,
				fileSize: Number.parseFloat(data.size ?? '0'),
				isEmpty: data.path === '',
				isMounted: false,
			});
			editor.engine.componentObserver.on('file-select', ({ path, fileSize, isEmpty }) => {
				if (isEmpty) {
					return;
				}

				editor.update('$path', path);
				editor.update('$formatedSize', formatByteSize(fileSize));
				editor.update('$size', fileSize.toString());
			});

			editor.update('$downloadCheck', !!data.download);
		},
		beforeChange(newValues) {
			return {
				...newValues,
				download: newValues.downloadCheck ? (newValues.name ?? newValues.path) : '',
			};
		},
	},
});
