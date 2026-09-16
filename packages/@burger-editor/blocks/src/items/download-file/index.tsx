import {
	Checkbox,
	FileList,
	FileUploader,
	Preview,
	TextField,
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

		// ファイル一覧・アップローダーからの選択をエディタ状態に反映する
		// （マウント時に自分自身がselectした値と一致する場合は反映済みなので
		// 何もしない — 下のマウントeffectとの二重更新を避ける）
		const selected = useSyncExternalStore(
			fileBrowser.subscribe,
			() => fileBrowser.getSnapshot().selected.other,
		);
		useEffect(() => {
			if (!selected?.path || selected.path === (state.path ?? '')) {
				return;
			}
			setState((prev) => ({
				...prev,
				path: selected.path,
				formatedSize: formatByteSize(selected.fileSize),
				size: selected.fileSize.toString(),
			}));
			// eslint-disable-next-line react-hooks/exhaustive-deps
		}, [selected]);

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
