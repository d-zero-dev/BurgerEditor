import {
	Checkbox,
	FileList,
	FileUploader,
	Preview,
	TextField,
	useExternalFileSelection,
	useFileBrowser,
} from '@burger-editor/client/ui';
import { createItem } from '@burger-editor/core';
import { formatByteSize } from '@burger-editor/utils';
import { useEffect, useSyncExternalStore } from 'react';

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
	Editor({ state, setState }) {
		const fileBrowser = useFileBrowser();

		// ファイル一覧・アップローダーからの選択をエディタ状態に反映する。
		// selectedはengine単位で共有されるFileBrowserStoreの値のため、
		// マウント直後は前に開いていた別itemの残留選択の可能性がある —
		// useExternalFileSelectionが初回発火をスキップし、下のマウント
		// effect（自分自身のpathをstoreへ登録する側）に委ねる
		const selected = useSyncExternalStore(
			fileBrowser.subscribe,
			() => fileBrowser.getSnapshot().selected.other,
		);
		useExternalFileSelection(
			selected,
			() => state.path ?? '',
			(next) => {
				setState((prev) => ({
					...prev,
					path: next.path,
					formatedSize: formatByteSize(next.fileSize),
					size: next.fileSize.toString(),
				}));
			},
		);

		// 初回マウント時に現在のファイルをfileBrowserへ登録し、FileListの
		// ハイライト・アップロード完了時の反映先を揃える
		useEffect(() => {
			fileBrowser.select('other', state.path ?? '', Number.parseFloat(state.size ?? '0'));
			// eslint-disable-next-line react-hooks/exhaustive-deps
		}, []);

		return (
			<div data-bge-dialog="2col">
				<div data-bge-dialog-ui="sticky">
					<div>
						<Preview path={state.path ?? ''} />
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
					<FileUploader fileType="other" />
					<FileList fileType="other" />
				</div>
			</div>
		);
	},
});
