import {
	IconFile,
	IconFileTypeDoc,
	IconFileTypePdf,
	IconFileTypePpt,
	IconFileTypeXls,
	IconHeadphones,
	IconVideo,
} from '@tabler/icons-react';
import { useState } from 'react';

import { getExt } from '../get-ext.js';

import styles from './thumbnail.module.css';

/**
 * File thumbnail. Renders an image/video preview or a file-type icon.
 *
 * The file type is inferred from the URL's extension (`getExt`) — the
 * URL is the only information available here, so the extension decides
 * whether the file can be previewed inline or needs a type icon.
 * @param root0
 * @param root0.src
 * @example
 * ```tsx
 * <Thumbnail src={file.url} />
 * ```
 */
export function Thumbnail({ src }: { readonly src: string }) {
	const [isLoaded, setIsLoaded] = useState(false);

	const file = getExt(src);

	return (
		<span
			className={styles['thumbnail']}
			data-bge-editor-ui-component="thumbnail"
			data-loaded={isLoaded}>
			{file.isImage ? (
				<img
					src={src}
					alt="画像のプレビュー"
					loading="lazy"
					onLoad={() => setIsLoaded(true)}
				/>
			) : file.isVideo ? (
				<video controls={false} playsInline>
					<source src={src} type={`video/${file.ext}`} />
					<track kind="captions" src="" />
					<IconVideo />
				</video>
			) : file.isAudio ? (
				<IconHeadphones />
			) : file.isDoc ? (
				<IconFileTypeDoc />
			) : file.isPpt ? (
				<IconFileTypePpt />
			) : file.isXls ? (
				<IconFileTypeXls />
			) : file.isPdf ? (
				<IconFileTypePdf />
			) : (
				<IconFile />
			)}
		</span>
	);
}
