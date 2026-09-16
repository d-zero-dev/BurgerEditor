import { useEffect, useState, useSyncExternalStore } from 'react';

import { useFileBrowser } from '../file-browser/use-file-browser.js';
import { getExt } from '../get-ext.js';

import styles from './preview.module.css';

/**
 * File preview pane. The previewed path comes from the parent (lifted
 * from the item's own state); upload progress is read from the engine's
 * `FileBrowserStore`, shared with `FileList`/`FileUploader`.
 * @param root0
 * @param root0.path
 * @example
 * ```tsx
 * <Preview path={state.path ?? ''} />
 * ```
 */
export function Preview({ path }: { readonly path: string }) {
	const store = useFileBrowser();
	const [dimension, setDimension] = useState<{
		readonly width: number;
		readonly height: number;
	} | null>(null);

	// path変更時のリセットはeffectではなくrender中に行う
	// （effect内の同期setStateはカスケードレンダーを起こすため）
	const [prevPath, setPrevPath] = useState(path);
	if (prevPath !== path) {
		setPrevPath(path);
		setDimension(null);
	}

	const file = path ? getExt(path) : null;
	const isUploadingMode = path.startsWith('blob:');

	const uploads = useSyncExternalStore(
		store.subscribe,
		() => store.getSnapshot().uploads,
	);
	const progress = uploads.find((u) => u.blob === path) ?? { uploaded: 0, total: 100 };

	useEffect(() => {
		const file = path ? getExt(path) : null;
		let aborted = false;

		if (file?.isImage) {
			const image = new Image();
			image.src = path;
			image.addEventListener(
				'load',
				() => {
					if (!aborted) {
						setDimension({ width: image.naturalWidth, height: image.naturalHeight });
					}
				},
				{ once: true },
			);
		} else if (file?.isVideo) {
			const video = document.createElement('video');
			video.src = path;
			video.addEventListener(
				'loadedmetadata',
				() => {
					if (!aborted) {
						setDimension({ width: video.videoWidth, height: video.videoHeight });
					}
				},
				{ once: true },
			);
		}

		return () => {
			aborted = true;
		};
	}, [path]);

	return (
		<div>
			<div
				className={`${styles['img']} ${isUploadingMode ? styles['uploading'] : ''}`.trim()}>
				{file?.isImage ? (
					<img src={path} alt="画像プレビュー" />
				) : file?.isVideo ? (
					<video controls playsInline>
						<source src={path} type={`video/${file.ext}`} />
						<track kind="captions" src="" />
					</video>
				) : file?.isAudio ? (
					<audio controls>
						<source src={path} type={`audio/${file.ext}`} />
						<track kind="metadata" src="" />
					</audio>
				) : file?.isDoc || file?.isPpt || file?.isXls || file?.isPdf ? (
					<object
						data={path}
						type={`application/${file.ext}`}
						title={`${file.ext}ファイルのプレビュー`}>
						<p>プレビューできません</p>
					</object>
				) : (
					<p>プレビューできません</p>
				)}
				{isUploadingMode ? (
					<div
						className={styles['progress']}
						style={{ translate: `${(progress.uploaded / progress.total) * 100}%` }}></div>
				) : null}
			</div>
			<ul className={styles['meta']}>
				{isUploadingMode ? (
					<li className={styles['upload']}>
						<span>アップロード...</span>
						<span className={styles['progress']}>
							{Math.round((progress.uploaded / progress.total) * 100)}% (
							{progress.uploaded}/{progress.total})
						</span>
					</li>
				) : (
					<li className={styles['path']}>
						<a href={path} target="_blank">
							{path}
						</a>
					</li>
				)}
				{dimension ? (
					<li className={styles['dimension']}>
						{dimension.width}x{dimension.height}
					</li>
				) : null}
			</ul>
		</div>
	);
}
