import type { BurgerEditorEngine, FileType } from '@burger-editor/core';

import { useId, useRef } from 'react';

import { useCommand } from '../use-command.js';

import styles from './file-uploader.module.css';

/**
 * File upload control. The trigger button declares a local command and
 * the handler opens the picker via `showPicker()` — no click handlers,
 * no programmatic `click()`.
 * @param root0
 * @param root0.engine
 * @param root0.fileType
 */
export function FileUploader({
	engine,
	fileType,
}: {
	readonly engine: BurgerEditorEngine;
	readonly fileType: FileType;
}) {
	const rootId = useId();
	const inputRef = useRef<HTMLInputElement>(null);

	const accept = fileType === 'image' ? 'image/*' : '*';

	const rootRef = useCommand<HTMLDivElement>({
		'--open-file-picker': () => {
			inputRef.current?.showPicker();
		},
	});

	const stageFile = async () => {
		const inputFile = inputRef.current;
		const file = inputFile?.files?.[0];
		if (!file) {
			return;
		}

		const path = URL.createObjectURL(file);

		engine.componentObserver.notify('file-select', {
			path,
			fileSize: file.size,
			isEmpty: false,
		});

		try {
			const res = await engine.serverAPI.postFile?.(fileType, file, (uploaded, total) => {
				engine.componentObserver.notify('file-upload-progress', {
					blob: path,
					uploaded,
					total,
				});
			});

			if (!res || res.error) {
				throw new Error(`Failed to upload file: ${file.name}`);
			}

			engine.componentObserver.notify('file-listup', {
				fileType: fileType,
				data: [res.uploaded],
			});

			engine.componentObserver.notify('file-select', {
				path: res.uploaded.url,
				fileSize: res.uploaded.size,
				isEmpty: false,
			});
		} catch {
			// onChangeからのfire-and-forget呼び出しのため、ここで
			// ユーザーに通知しないと失敗が闇に消える
			alert(`ファイルのアップロードに失敗しました: ${file.name}`);
		}
	};

	return (
		<div ref={rootRef} id={rootId} className={styles['uploader']}>
			<input
				type="file"
				ref={inputRef}
				onChange={() => void stageFile()}
				accept={accept}
			/>
			<button type="button" command="--open-file-picker" commandfor={rootId}>
				ファイルを追加アップロードする
			</button>
		</div>
	);
}
