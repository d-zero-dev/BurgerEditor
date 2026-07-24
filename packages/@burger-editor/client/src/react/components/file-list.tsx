import type { BurgerEditorEngine, FileListItem, FileType } from '@burger-editor/core';
import type { ReactNode } from 'react';

import { formatByteSize, formatDate } from '@burger-editor/utils';
import { Fragment, useId, useRef, useState } from 'react';

import { useCommand } from '../use-command.js';
import { useComponentEvent } from '../use-engine.js';

import styles from './file-list.module.css';
import { Thumbnail } from './thumbnail.js';

/**
 * Paginated, searchable file list. Selection is broadcast on the
 * engine-level component observer (`file-select`); buttons declare local
 * commands instead of click handlers.
 * @param root0
 * @param root0.engine
 * @param root0.fileType
 */
export function FileList({
	engine,
	fileType,
}: {
	readonly engine: BurgerEditorEngine;
	readonly fileType: FileType;
}) {
	const rootId = useId();

	const getFileList = engine.serverAPI.getFileList;
	const deleteFile = engine.serverAPI.deleteFile;

	const [fileList, setFileList] = useState<readonly FileListItem[]>([]);
	const [selectedPath, setSelectedPath] = useState('');
	const [searchWord, setSearchWord] = useState('');
	const [currentPage, setCurrentPage] = useState(0);
	const [totalPage, setTotalPage] = useState(1);
	const [progress, setProgress] = useState({ uploaded: 0, total: 100 });

	const requestDebounce = useRef(-1);

	useComponentEvent(engine, 'file-select', async ({ path, isMounted }) => {
		setSelectedPath(path);

		if (
			!isMounted && // On initial mount
			getFileList
		) {
			const result = await getFileList(fileType, {
				filter: '',
				page: 0,
				selected: path,
			});
			setFileList(result.data);
			setCurrentPage(result.pagination.current);
			setTotalPage(result.pagination.total);
		}

		if (path.startsWith('blob:')) {
			setFileList((prev) => [
				{
					fileId: '',
					name: '',
					size: 0,
					timestamp: Date.now(),
					url: path,
					sizes: {},
				},
				...prev.filter((file) => !file.url.startsWith('blob:')),
			]);
		}

		const selectedButton = await awaitUntilFound(() =>
			document.querySelector<HTMLButtonElement>(
				`button[aria-pressed="true"]:has(img[src="${path}"])`,
			),
		);
		if (selectedButton) {
			selectedButton.scrollIntoView({
				behavior: 'smooth',
				block: 'nearest',
			});
		}
	});

	useComponentEvent(engine, 'file-upload-progress', (p) => {
		if (p.blob === selectedPath) {
			setProgress({ uploaded: p.uploaded, total: p.total });
		}
	});

	useComponentEvent(engine, 'file-listup', ({ data }) => {
		setFileList(data);
	});

	const paginate = (page: number) => {
		page = Number.isNaN(page) ? 0 : Math.min(Math.max(0, page), totalPage - 1);
		if (currentPage === page) {
			return;
		}
		setCurrentPage(page);
		window.clearTimeout(requestDebounce.current);
		requestDebounce.current = window.setTimeout(async () => {
			const result = await getFileList?.(fileType, { page });
			if (result) {
				setFileList(result.data);
				setCurrentPage(result.pagination.current);
				setTotalPage(result.pagination.total);
			}
		}, 100);
	};

	const search = (value: string) => {
		if (searchWord === value) {
			return;
		}
		setSearchWord(value);
		window.clearTimeout(requestDebounce.current);
		requestDebounce.current = window.setTimeout(async () => {
			const result = await getFileList?.(fileType, { filter: value });
			if (result) {
				setFileList(result.data);
				setCurrentPage(result.pagination.current);
				setTotalPage(result.pagination.total);
			}
		}, 300);
	};

	const rootRef = useCommand<HTMLDivElement>({
		'--paginate': (e) => {
			const direction = (e.source as HTMLButtonElement | null)?.value;
			paginate(direction === 'prev' ? currentPage - 1 : currentPage + 1);
		},
		'--select-file': (e) => {
			const source = e.source as HTMLButtonElement | null;
			if (!source) {
				return;
			}
			engine.componentObserver.notify('file-select', {
				path: source.value,
				fileSize: Number(source.dataset['size'] ?? '0'),
				isEmpty: false,
				isMounted: true,
			});
		},
		'--delete-file': (e) => {
			const url = (e.source as HTMLButtonElement | null)?.value;
			if (!url) {
				return;
			}
			void deleteFile?.(fileType, url);
		},
	});

	const marked = (text: string): ReactNode => {
		if (!searchWord) {
			return text;
		}
		const chars = text.split(searchWord);
		return chars.map((char, i) => (
			<Fragment key={char + i}>
				{i === 0 ? null : <mark>{searchWord}</mark>}
				{char}
			</Fragment>
		));
	};

	return (
		<div ref={rootRef} id={rootId}>
			<div className={styles['ctrl']}>
				<div className={styles['pagination']}>
					<button
						type="button"
						disabled={currentPage === 0}
						command="--paginate"
						commandfor={rootId}
						value="prev">
						前へ
					</button>
					<div className={styles['page']}>
						<span>
							<input
								type="number"
								value={currentPage + 1}
								min="1"
								max={totalPage}
								onChange={(e) => paginate(e.currentTarget.valueAsNumber - 1)}
								aria-label="ページ番号"
							/>
						</span>
						<span>/</span>
						<span>{totalPage}</span>
					</div>
					<button
						type="button"
						disabled={currentPage === totalPage - 1}
						command="--paginate"
						commandfor={rootId}
						value="next">
						次へ
					</button>
				</div>
				<input
					type="search"
					placeholder="検索"
					value={searchWord}
					onChange={(e) => search(e.currentTarget.value)}
				/>
			</div>

			<ul className={styles['list']}>
				{fileList.map((file) => (
					<li key={file.url}>
						<button
							className={styles['file']}
							type="button"
							aria-pressed={file.url === selectedPath}
							command="--select-file"
							commandfor={rootId}
							value={file.url}
							data-size={file.size}>
							<span className={styles['thumbnail']}>
								<Thumbnail src={file.url} />
							</span>
							{file.url.startsWith('blob:') ? (
								<span>
									アップロード中...{' '}
									<span>{Math.floor((progress.uploaded / progress.total) * 100)}%</span>
								</span>
							) : (
								<span className={styles['attr']}>
									<span>ID</span>
									<span>{marked(file.fileId)}</span>
									<span>名称</span>
									<span>{marked(file.name)}</span>
									<span>更新</span>
									<span>{formatDate(file.timestamp / 1000, 'YYYY-MM-DD HH:mm')}</span>
									<span>サイズ</span>
									<span>{formatByteSize(file.size)}</span>
								</span>
							)}
						</button>
						{!file.url.startsWith('blob:') && deleteFile ? (
							<button
								className={styles['delete']}
								type="button"
								command="--delete-file"
								commandfor={rootId}
								value={file.url}>
								削除
							</button>
						) : null}
					</li>
				))}
			</ul>
		</div>
	);
}

/**
 * Poll with requestAnimationFrame until the callback returns a truthy
 * value (matches the legacy behavior).
 * @param callback - Returns the searched value or null
 */
async function awaitUntilFound<T>(callback: () => T): Promise<T> {
	const result = callback();
	if (result) {
		return result;
	}
	await new Promise((resolve) => {
		requestAnimationFrame(resolve);
	});
	return awaitUntilFound(callback);
}
