import type { FileType } from '@burger-editor/core';
import type { ReactNode } from 'react';

import { formatByteSize, formatDate } from '@burger-editor/utils';
import {
	Fragment,
	use,
	useDeferredValue,
	useId,
	useState,
	useSyncExternalStore,
	useTransition,
} from 'react';

import { useFileBrowser } from '../file-browser/use-file-browser.js';
import { useCommand } from '../use-command.js';

import styles from './file-list.module.css';
import { Thumbnail } from './thumbnail.js';

/**
 * Paginated, searchable file list. Reads its page through `use()` against
 * the engine's `FileBrowserStore` (suspends into the dialog's Suspense
 * boundary while loading); selection and in-flight uploads come from the
 * same store, shared with `FileUploader` and the item's own `Editor`
 * instead of a broadcast bus.
 * @param root0
 * @param root0.fileType
 * @example
 * ```tsx
 * <FileUploader fileType="image" />
 * <FileList fileType="image" />
 * ```
 */
export function FileList({ fileType }: { readonly fileType: FileType }) {
	// store.read()はReactの外（FileBrowserStoreの内部Mapキャッシュ）が
	// invalidate()で更新される、意図的に不純な関数（react.devのRules of
	// Reactに違反する — 同じ引数でも呼び出しごとに結果が変わりうる）。
	// React Compilerは「同じ引数なら前回の結果を再利用してよい」と誤って
	// 判断し、アップロード/削除後のinvalidate()に対する再取得
	// （getFileListの再呼び出し）を静かにスキップしてしまう
	// （file-list.spec.tsxの回帰テストで実測確認済み）。この関数だけ
	// コンパイラの最適化対象から明示的に外す
	'use no memo';

	const store = useFileBrowser();
	const rootId = useId();

	const [page, setPage] = useState(0);
	const [searchWord, setSearchWord] = useState('');
	const deferredFilter = useDeferredValue(searchWord);
	const [isPending, startTransition] = useTransition();

	const selected = useSyncExternalStore(
		store.subscribe,
		() => store.getSnapshot().selected[fileType],
	);
	const uploads = useSyncExternalStore(
		store.subscribe,
		() => store.getSnapshot().uploads,
	);
	const myUploads = uploads.filter((u) => u.fileType === fileType);

	const result = use(store.read({ fileType, page, filter: deferredFilter }));
	const totalPage = result.pagination.total;
	const currentPage = result.pagination.current;

	// アップロード中のblob行を先頭に合成する。サーバーはまだこのファイルを
	// 知らないため、result.dataとは別にstoreのuploadsから直接描画する
	const files = [
		// timestampは常にuploadブランチ側の表示（進捗%）のため未使用 —
		// アップロード完了行の描画には使われない
		...myUploads.map((u) => ({
			fileId: '',
			name: '',
			size: 0,
			timestamp: 0,
			url: u.blob,
			sizes: {},
		})),
		...result.data.filter((f) => !myUploads.some((u) => u.blob === f.url)),
	];

	const paginate = (nextPage: number) => {
		nextPage = Number.isNaN(nextPage)
			? 0
			: Math.min(Math.max(0, nextPage), totalPage - 1);
		if (nextPage === currentPage) {
			return;
		}
		startTransition(() => {
			setPage(nextPage);
		});
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
			store.select(fileType, source.value, Number(source.dataset['size'] ?? '0'));
		},
		'--delete-file': (e) => {
			const url = (e.source as HTMLButtonElement | null)?.value;
			if (!url) {
				return;
			}
			startTransition(async () => {
				try {
					await store.deleteFile(fileType, url);
				} catch {
					alert('ファイルの削除に失敗しました。');
				}
			});
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
		<div ref={rootRef} id={rootId} aria-busy={isPending}>
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
					onChange={(e) => setSearchWord(e.currentTarget.value)}
				/>
			</div>

			<ul className={styles['list']}>
				{files.map((file) => {
					const upload = myUploads.find((u) => u.blob === file.url);
					return (
						<li key={file.url}>
							<button
								ref={file.url === selected?.path ? scrollToSelected : undefined}
								className={styles['file']}
								type="button"
								aria-pressed={file.url === selected?.path}
								command="--select-file"
								commandfor={rootId}
								value={file.url}
								data-size={file.size}>
								<span className={styles['thumbnail']}>
									<Thumbnail src={file.url} />
								</span>
								{upload ? (
									<span>
										アップロード中...{' '}
										<span>{Math.floor((upload.uploaded / upload.total) * 100)}%</span>
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
							{!upload && store.canDelete ? (
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
					);
				})}
			</ul>
		</div>
	);
}

/**
 * Callback ref attached only to the currently selected file button, so the
 * list scrolls to it when the selection mounts or changes. Kept at module
 * scope for a stable identity — an inline arrow would re-attach (and
 * re-scroll) on every unrelated re-render such as upload progress updates.
 * @param el - The selected button, or null on detach
 */
function scrollToSelected(el: HTMLButtonElement | null) {
	el?.scrollIntoView({
		behavior: 'smooth',
		block: 'nearest',
	});
}
