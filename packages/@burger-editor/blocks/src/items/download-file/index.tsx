import {
	Checkbox,
	FileList,
	FileUploader,
	Preview,
	TextField,
	useComponentEvent,
} from '@burger-editor/client/react';
import { createItem } from '@burger-editor/core';
import { formatByteSize } from '@burger-editor/utils';
import { useEffect } from 'react';

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
	Editor({ state, setState, engine }) {
		// ファイル一覧・アップローダーからの選択をエディタ状態に反映する
		useComponentEvent(engine, 'file-select', ({ path, fileSize, isEmpty }) => {
			if (isEmpty) {
				return;
			}
			setState((prev) => ({
				...prev,
				path,
				formatedSize: formatByteSize(fileSize),
				size: fileSize.toString(),
			}));
		});

		// 初回マウント時に現在のファイルを通知してファイル一覧をロードさせる
		useEffect(() => {
			engine.componentObserver.notify('file-select', {
				path: state.path ?? '',
				fileSize: Number.parseFloat(state.size ?? '0'),
				isEmpty: (state.path ?? '') === '',
				isMounted: false,
			});
		}, []);

		return (
			<div data-bge-dialog="2col">
				<div data-bge-dialog-ui="sticky">
					<div>
						<Preview engine={engine} path={state.path ?? ''} />
					</div>

					<div>
						<TextField
							label="表示ファイル名"
							name="bge-name"
							value={state.name ?? ''}
							onChange={(name) => setState({ ...state, name })}
						/>
						<Checkbox
							name="bge-download-check"
							label="ブラウザで開かずに直接ダウンロードさせる"
							checked={state.downloadCheck ?? false}
							onChange={(downloadCheck) => setState({ ...state, downloadCheck })}
						/>
					</div>
				</div>
				<div>
					<FileUploader engine={engine} fileType="other" />
					<FileList engine={engine} fileType="other" />
				</div>
			</div>
		);
	},
});
