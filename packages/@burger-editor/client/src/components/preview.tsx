import type { BurgerEditorEngine } from '@burger-editor/core';

import { useEffect, useState } from 'react';

import { getExt } from '../get-ext.js';
import { useComponentEvent } from '../use-engine.js';

import styles from './preview.module.css';

/**
 * File preview pane. The previewed path comes from the parent (lifted
 * from the old `file-select` observer event); upload progress stays on
 * the engine-level component observer.
 * @param root0
 * @param root0.engine
 * @param root0.path
 */
export function Preview({
	engine,
	path,
}: {
	readonly engine: BurgerEditorEngine;
	readonly path: string;
}) {
	const [dimension, setDimension] = useState<{
		readonly width: number;
		readonly height: number;
	} | null>(null);
	const [progress, setProgress] = useState({ uploaded: 0, total: 100 });

	const file = path ? getExt(path) : null;
	const isUploadingMode = path.startsWith('blob:');

	useComponentEvent(engine, 'file-upload-progress', (p) => {
		if (p.blob === path) {
			setProgress({ uploaded: p.uploaded, total: p.total });
		}
	});

	useEffect(() => {
		setDimension(null);

		const file = path ? getExt(path) : null;

		if (file?.isImage) {
			const image = new Image();
			image.src = path;
			image.addEventListener(
				'load',
				() => {
					setDimension({ width: image.naturalWidth, height: image.naturalHeight });
				},
				{ once: true },
			);
		} else if (file?.isVideo) {
			const video = document.createElement('video');
			video.src = path;
			video.addEventListener(
				'loadedmetadata',
				() => {
					setDimension({ width: video.videoWidth, height: video.videoHeight });
				},
				{ once: true },
			);
		}
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
