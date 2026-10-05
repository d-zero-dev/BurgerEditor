import type {
	BurgerEditorEngine,
	FileListResult,
	FileType,
	FileRequestOptions,
} from '@burger-editor/core';

/**
 * A file currently selected for a given `FileType` inside a dialog — the
 * path the item editor should apply, plus the byte size the old
 * `file-select` component-observer payload used to carry.
 */
export interface SelectedFile {
	readonly path: string;
	readonly fileSize: number;
}

/**
 * One upload in flight. Kept in the store (not local component state) so
 * `FileList` and `Preview` — siblings under the same item editor — both
 * see the same synthetic "uploading…" row / progress bar without a
 * broadcast bus.
 */
export interface UploadProgress {
	readonly fileType: FileType;
	readonly blob: string;
	readonly uploaded: number;
	readonly total: number;
}

export interface FileBrowserQuery {
	readonly fileType: FileType;
	readonly page: number;
	readonly filter: string;
}

interface FileBrowserState {
	readonly selected: { readonly [K in FileType]?: SelectedFile };
	readonly uploads: readonly UploadProgress[];
}

const EMPTY_RESULT: FileListResult = {
	error: false,
	data: [],
	pagination: { current: 0, total: 1 },
};

type Listener = () => void;

/**
 * Cache key for a file-list query — used both to look up a cached
 * promise and (via its `fileType` prefix) to find every cached page for
 * a given file type on invalidation.
 *
 * `selectedPath` (present only on the very first read for a `fileType`,
 * see {@link FileBrowserStore.read}) is folded into the key so that an
 * initial read's response — which the server may have jumped to a
 * different page than the one requested, to land on the selected file —
 * never collides with a later, unrelated `{fileType, page, filter}`
 * request for the *same nominal page* opened by a different item in the
 * same engine session. Without this, a second item reusing page 0 would
 * transparently receive the first item's page-jumped response instead of
 * a real page 0.
 * @param query - The query to key
 * @param selectedPath - The `selected` path actually sent with this
 * query, if any
 */
function queryKey(query: FileBrowserQuery, selectedPath: string | undefined): string {
	return `${query.fileType}:${query.page}:${query.filter}:${selectedPath ?? ''}`;
}

/**
 * Per-engine file-browser state: paginated/filtered `getFileList` query
 * results (cached by query, read through `use()`), the file currently
 * selected per `FileType`, and in-flight upload progress.
 *
 * React-independent so it can be constructed once per engine and shared
 * by every component that opens onto the same file browser (`FileList`,
 * `FileUploader`, `Preview`, and the item's own `Editor`) without a
 * window-level broadcast bus — see {@link getFileBrowserStore}.
 * @example
 * ```tsx
 * const store = getFileBrowserStore(engine);
 * const result = use(store.read({ fileType: 'image', page: 0, filter: '' }));
 * const selected = useSyncExternalStore(store.subscribe, store.getSnapshot);
 * ```
 */
export class FileBrowserStore {
	readonly getSnapshot = (): FileBrowserState => this.#state;

	readonly subscribe = (listener: Listener): (() => void) => {
		this.#listeners.add(listener);
		return () => {
			this.#listeners.delete(listener);
		};
	};

	readonly #engine: BurgerEditorEngine;
	// fileTypeごとに最初の一回だけ`selected`をサーバーへ渡すためのフラグ。
	// invalidate()では落とさない（アップロード/削除後の再取得のたびに
	// 選択中ファイルのページへ引き戻されると、そのページを見ていた
	// ユーザーの手動ページ送りが台無しになる）
	readonly #initialReadDone = new Set<FileType>();
	readonly #listeners = new Set<Listener>();
	readonly #queries = new Map<string, Promise<FileListResult>>();
	#state: FileBrowserState = { selected: {}, uploads: [] };

	/** Whether the engine's `serverAPI` supports deleting files. */
	get canDelete(): boolean {
		return !!this.#engine.serverAPI.deleteFile;
	}

	constructor(engine: BurgerEditorEngine) {
		this.#engine = engine;
	}

	/**
	 * Delete a file from the server and invalidate `fileType`'s cached
	 * pages so the list reflects the deletion on next read.
	 * @param fileType - The file type the file belongs to
	 * @param url - The file's URL
	 * @throws {Error} When the server reports the deletion failed
	 */
	async deleteFile(fileType: FileType, url: string): Promise<void> {
		const deleteFile = this.#engine.serverAPI.deleteFile;
		if (!deleteFile) {
			return;
		}
		const res = await deleteFile(fileType, url);
		if (res.error) {
			throw new Error(`Failed to delete file: ${url}`);
		}
		this.invalidate(fileType);
	}

	/**
	 * Drop every cached page for `fileType` and notify subscribers, so the
	 * next `read()` for that type issues a fresh request (after an upload
	 * or a delete changes the underlying list).
	 * @param fileType - The file type whose cached pages should be dropped
	 */
	invalidate(fileType: FileType): void {
		const prefix = `${fileType}:`;
		for (const key of this.#queries.keys()) {
			if (key.startsWith(prefix)) {
				this.#queries.delete(key);
			}
		}
		this.#emit();
	}

	/**
	 * Read (and cache) one page of the file list. The returned promise is
	 * stable per `{fileType, page, filter}` plus whether this particular
	 * read sent `selected` (see below) — safe to pass to `use()` directly
	 * from render, repeated calls with the same query return the same
	 * promise instead of re-suspending.
	 *
	 * The very first read for a given `fileType` also sends the currently
	 * selected file's path as `selected`, so the server can jump straight
	 * to the page that already contains it (e.g. re-opening an image item
	 * whose file isn't on page 0) instead of always starting at `page`.
	 * Later reads for that `fileType` (explicit pagination, search, or a
	 * post-upload/-delete refetch via {@link invalidate}) omit it — always
	 * including it would silently override the page the caller asked for.
	 *
	 * Because that jump means the response's actual page can differ from
	 * the requested one, `selected` is folded into the cache key (see
	 * {@link queryKey}): a later item opening the same `fileType` and
	 * nominal page never transparently receives the first item's
	 * page-jumped response — it misses the cache and gets a real page.
	 * @param query - The file type, page and filter to query
	 * @returns The (possibly still-pending, cached) file list page
	 */
	read(query: FileBrowserQuery): Promise<FileListResult> {
		const isInitialRead = !this.#initialReadDone.has(query.fileType);
		const selectedPath = isInitialRead
			? this.#state.selected[query.fileType]?.path
			: undefined;
		const key = queryKey(query, selectedPath);
		const cached = this.#queries.get(key);
		if (cached) {
			return cached;
		}
		this.#initialReadDone.add(query.fileType);
		const getFileList = this.#engine.serverAPI.getFileList;
		const options: FileRequestOptions = {
			page: query.page,
			filter: query.filter,
			selected: selectedPath,
		};
		const promise = getFileList
			? getFileList(query.fileType, options)
			: Promise.resolve(EMPTY_RESULT);
		// 失敗したクエリはキャッシュに残さず、再レンダーで再試行できるようにする
		promise.catch(() => {
			this.#queries.delete(key);
		});
		this.#queries.set(key, promise);
		return promise;
	}

	/**
	 * Record the file currently selected for `fileType` — a no-op when the
	 * path is unchanged, so callers can call this unconditionally (e.g.
	 * every render) without causing redundant notifications.
	 * @param fileType - The file type being selected for
	 * @param path - The selected file's path, or `''` for "nothing selected"
	 * @param fileSize - The selected file's byte size, when known
	 */
	select(fileType: FileType, path: string, fileSize = 0): void {
		const current = this.#state.selected[fileType];
		if (current?.path === path) {
			return;
		}
		this.#patch({
			selected: { ...this.#state.selected, [fileType]: { path, fileSize } },
		});
	}

	/**
	 * Upload a file, tracking progress in `uploads` (so `FileList` and
	 * `Preview` can both show it) and selecting the resulting URL once the
	 * server responds — a blob URL is selected immediately so the UI has
	 * something to show while the upload is in flight.
	 *
	 * The blob URL is revoked once the upload settles. On failure the
	 * selection is restored to what it was before the upload (empty path if
	 * nothing was selected), so a revoked blob URL is never left selected
	 * for the dialog to confirm.
	 * @param fileType - The file type to upload into
	 * @param file - The file to upload
	 * @throws {Error} When no `postFile` API is configured, or the server
	 * reports the upload failed
	 */
	async upload(fileType: FileType, file: File): Promise<void> {
		const postFile = this.#engine.serverAPI.postFile;
		const blob = URL.createObjectURL(file);
		const previous = this.#state.selected[fileType];
		this.select(fileType, blob, file.size);
		this.#patch({
			uploads: [
				...this.#state.uploads,
				{ fileType, blob, uploaded: 0, total: file.size || 1 },
			],
		});
		try {
			if (!postFile) {
				throw new Error('postFile is not configured');
			}
			const res = await postFile(fileType, file, (uploaded, total) => {
				this.#patch({
					uploads: this.#state.uploads.map((u) =>
						u.blob === blob ? { ...u, uploaded, total } : u,
					),
				});
			});
			if (res.error) {
				throw new Error(`Failed to upload file: ${file.name}`);
			}
			this.invalidate(fileType);
			this.select(fileType, res.uploaded.url, res.uploaded.size);
		} catch (error) {
			// 失敗したblob URLを選択に残すと、解放後に壊れたプレビューと無効な
			// pathが確定されてしまうため、アップロード前の選択へ戻す
			this.select(fileType, previous?.path ?? '', previous?.fileSize);
			throw error;
		} finally {
			this.#patch({ uploads: this.#state.uploads.filter((u) => u.blob !== blob) });
			// blob URLはアップロード中のプレビュー専用。成功時は選択が実URLへ
			// 移っており、失敗時もこれ以上の参照元はないので、必ずここで解放する
			URL.revokeObjectURL(blob);
		}
	}

	#emit(): void {
		for (const listener of this.#listeners) {
			listener();
		}
	}

	#patch(patch: Partial<FileBrowserState>): void {
		this.#state = { ...this.#state, ...patch };
		this.#emit();
	}
}

const stores = new WeakMap<BurgerEditorEngine, FileBrowserStore>();

/**
 * Get (creating on first access) the `FileBrowserStore` for `engine`. One
 * store per engine, shared by every component under it — see
 * {@link FileBrowserStore}.
 * @param engine - The engine to get the store for
 * @returns That engine's file-browser store
 */
export function getFileBrowserStore(engine: BurgerEditorEngine): FileBrowserStore {
	let store = stores.get(engine);
	if (!store) {
		store = new FileBrowserStore(engine);
		stores.set(engine, store);
	}
	return store;
}
