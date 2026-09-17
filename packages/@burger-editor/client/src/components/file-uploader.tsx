import type { FileType } from '@burger-editor/core';

import { useId, useRef, useTransition } from 'react';

import { useFileBrowser } from '../file-browser/use-file-browser.js';
import { useCommand } from '../use-command.js';

import styles from './file-uploader.module.css';

/**
 * File upload control. The trigger button declares a local command and
 * the handler opens the picker via `showPicker()` — no click handlers,
 * no programmatic `click()`. The upload itself goes through the engine's
 * `FileBrowserStore`, shared with `FileList`/`Preview` so they see the
 * same progress without a broadcast bus.
 * @param root0
 * @param root0.fileType
 * @example
 * ```tsx
 * <FileUploader fileType="image" />
 * ```
 */
export function FileUploader({ fileType }: { readonly fileType: FileType }) {
	const store = useFileBrowser();
	const rootId = useId();
	const inputRef = useRef<HTMLInputElement>(null);
	const [, startTransition] = useTransition();

	const accept = fileType === 'image' ? 'image/*' : '*';

	const rootRef = useCommand<HTMLDivElement>({
		'--open-file-picker': () => {
			inputRef.current?.showPicker();
		},
	});

	const stageFile = () => {
		const inputFile = inputRef.current;
		const file = inputFile?.files?.[0];
		if (!file) {
			return;
		}

		startTransition(async () => {
			try {
				await store.upload(fileType, file);
			} catch {
				// onChangeからのfire-and-forget呼び出しのため、ここで
				// ユーザーに通知しないと失敗が闇に消える
				alert(`ファイルのアップロードに失敗しました: ${file.name}`);
			}
		});
	};

	return (
		<div ref={rootRef} id={rootId} className={styles['uploader']}>
			<input type="file" ref={inputRef} onChange={stageFile} accept={accept} />
			<button type="button" command="--open-file-picker" commandfor={rootId}>
				ファイルを追加アップロードする
			</button>
		</div>
	);
}
