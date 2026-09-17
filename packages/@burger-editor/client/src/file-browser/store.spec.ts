import type { BurgerEditorEngine, FileListResult } from '@burger-editor/core';

import { test, expect, describe, vi } from 'vitest';

import { createMockEngine as createBaseMockEngine } from '../testing/create-mock-engine.js';

import { FileBrowserStore, getFileBrowserStore } from './store.js';

/**
 * 空のserverAPIを持つengineモックを作る
 * @param overrides - `serverAPI` に個別に差し込むメソッド
 */
function createMockEngine(
	overrides: Partial<BurgerEditorEngine['serverAPI']> = {},
): BurgerEditorEngine {
	return createBaseMockEngine({ serverAPI: { ...overrides } });
}

describe('getFileBrowserStore', () => {
	test('同じengineには同じstoreインスタンスを返す', () => {
		const engine = createMockEngine();
		expect(getFileBrowserStore(engine)).toBe(getFileBrowserStore(engine));
	});

	test('別のengineには別のstoreインスタンスを返す', () => {
		const a = createMockEngine();
		const b = createMockEngine();
		expect(getFileBrowserStore(a)).not.toBe(getFileBrowserStore(b));
	});
});

describe('FileBrowserStore.read', () => {
	test('同じクエリなら同じPromiseを返す（use()向けの安定性）', () => {
		const getFileList = vi.fn().mockResolvedValue({
			error: false,
			data: [],
			pagination: { current: 0, total: 1 },
		} satisfies FileListResult);
		const store = new FileBrowserStore(createMockEngine({ getFileList }));

		const p1 = store.read({ fileType: 'image', page: 0, filter: '' });
		const p2 = store.read({ fileType: 'image', page: 0, filter: '' });

		expect(p1).toBe(p2);
		expect(getFileList).toHaveBeenCalledTimes(1);
	});

	test('fileType/page/filterのいずれかが違えば別クエリとして扱う', () => {
		const getFileList = vi.fn().mockResolvedValue({
			error: false,
			data: [],
			pagination: { current: 0, total: 1 },
		} satisfies FileListResult);
		const store = new FileBrowserStore(createMockEngine({ getFileList }));

		void store.read({ fileType: 'image', page: 0, filter: '' });
		void store.read({ fileType: 'image', page: 1, filter: '' });
		void store.read({ fileType: 'other', page: 0, filter: '' });
		void store.read({ fileType: 'image', page: 0, filter: 'a' });

		expect(getFileList).toHaveBeenCalledTimes(4);
	});

	test('getFileListが未設定なら空の結果を返す', async () => {
		const store = new FileBrowserStore(createMockEngine());

		const result = await store.read({ fileType: 'image', page: 0, filter: '' });

		expect(result).toEqual({
			error: false,
			data: [],
			pagination: { current: 0, total: 1 },
		});
	});

	test('失敗したクエリはキャッシュされず、次のreadで再試行される', async () => {
		const getFileList = vi
			.fn()
			.mockRejectedValueOnce(new Error('network error'))
			.mockResolvedValueOnce({
				error: false,
				data: [],
				pagination: { current: 0, total: 1 },
			} satisfies FileListResult);
		const store = new FileBrowserStore(createMockEngine({ getFileList }));

		await expect(store.read({ fileType: 'image', page: 0, filter: '' })).rejects.toThrow(
			'network error',
		);
		await expect(
			store.read({ fileType: 'image', page: 0, filter: '' }),
		).resolves.toMatchObject({ error: false });
		expect(getFileList).toHaveBeenCalledTimes(2);
	});

	test('fileTypeごとの最初のreadだけ選択中ファイルのpathをselectedとして渡す（サーバー側の自動ページ送り向け）', () => {
		const getFileList = vi.fn().mockResolvedValue({
			error: false,
			data: [],
			pagination: { current: 0, total: 1 },
		} satisfies FileListResult);
		const store = new FileBrowserStore(createMockEngine({ getFileList }));
		store.select('image', '/img/selected.png');

		void store.read({ fileType: 'image', page: 0, filter: '' });
		expect(getFileList).toHaveBeenNthCalledWith(1, 'image', {
			page: 0,
			filter: '',
			selected: '/img/selected.png',
		});

		// 2回目以降（明示的なページ送り・検索）では毎回selectedへ引き戻される
		// と困るため渡さない
		void store.read({ fileType: 'image', page: 1, filter: '' });
		expect(getFileList).toHaveBeenNthCalledWith(2, 'image', {
			page: 1,
			filter: '',
			selected: undefined,
		});
	});

	test('invalidate後の再取得ではselectedを渡さない（アップロード/削除後にページが引き戻されない）', () => {
		const getFileList = vi.fn().mockResolvedValue({
			error: false,
			data: [],
			pagination: { current: 0, total: 1 },
		} satisfies FileListResult);
		const store = new FileBrowserStore(createMockEngine({ getFileList }));
		store.select('image', '/img/selected.png');

		void store.read({ fileType: 'image', page: 0, filter: '' });
		store.invalidate('image');
		void store.read({ fileType: 'image', page: 0, filter: '' });

		expect(getFileList).toHaveBeenNthCalledWith(2, 'image', {
			page: 0,
			filter: '',
			selected: undefined,
		});
	});

	test('別itemが同じfileType・同じページを開いても、前のitemの自動ページ送り済みキャッシュを受け取らない（regression）', async () => {
		// サーバーは selected を受け取るとその値を含む実際のページへジャンプ
		// することがあり、返ってくる pagination.current はリクエストした
		// page（常に0）と食い違いうる。この「食い違った」レスポンスが
		// {fileType, page, filter} だけでキャッシュされると、後から開いた
		// 別itemの「同じfileType・page 0・filter未指定」の素朴な最初の
		// readが、前itemのために自動ジャンプ済みのページ内容を誤って
		// 受け取ってしまう
		const getFileList = vi.fn(
			(_fileType: string, options: { selected?: string }): Promise<FileListResult> =>
				Promise.resolve({
					error: false,
					data: [],
					// selected付きのリクエストだけ「自動ページ送り」されたことを
					// pagination.currentの食い違いで模す
					pagination: { current: options.selected ? 3 : 0, total: 5 },
				}),
		);
		const store = new FileBrowserStore(createMockEngine({ getFileList }));

		// item A: マウント時にselectしてからpage 0を読む（自動ジャンプされる）
		store.select('image', '/img/a.png');
		const resultA = await store.read({ fileType: 'image', page: 0, filter: '' });
		expect(resultA.pagination.current).toBe(3);

		// item B: 別のファイルへselectし直してから、同じ{fileType, page: 0,
		// filter: ''}を読む（isInitialReadは既に消費済みのためselectedは
		// 送られないが、Aの自動ジャンプ済みレスポンスを再利用してはいけない）
		store.select('image', '/img/b.png');
		const resultB = await store.read({ fileType: 'image', page: 0, filter: '' });

		expect(resultB.pagination.current).toBe(0);
		expect(getFileList).toHaveBeenCalledTimes(2);
	});

	test('invalidateはその fileType のキャッシュだけ落とす', () => {
		const getFileList = vi.fn().mockResolvedValue({
			error: false,
			data: [],
			pagination: { current: 0, total: 1 },
		} satisfies FileListResult);
		const store = new FileBrowserStore(createMockEngine({ getFileList }));

		const imageQuery = { fileType: 'image', page: 0, filter: '' } as const;
		const otherQuery = { fileType: 'other', page: 0, filter: '' } as const;
		const before = { image: store.read(imageQuery), other: store.read(otherQuery) };

		store.invalidate('image');

		expect(store.read(imageQuery)).not.toBe(before.image);
		expect(store.read(otherQuery)).toBe(before.other);
	});
});

describe('FileBrowserStore.select', () => {
	test('未選択の状態からselectするとsubscriberに通知する', () => {
		const store = new FileBrowserStore(createMockEngine());
		const listener = vi.fn();
		store.subscribe(listener);

		store.select('image', '/img/a.png', 1024);

		expect(listener).toHaveBeenCalledTimes(1);
		expect(store.getSnapshot().selected.image).toEqual({
			path: '/img/a.png',
			fileSize: 1024,
		});
	});

	test('同じpathを選び直しても通知しない（no-op）', () => {
		const store = new FileBrowserStore(createMockEngine());
		store.select('image', '/img/a.png', 1024);
		const listener = vi.fn();
		store.subscribe(listener);

		store.select('image', '/img/a.png', 1024);

		expect(listener).not.toHaveBeenCalled();
	});

	test('fileTypeごとに独立して選択を保持する', () => {
		const store = new FileBrowserStore(createMockEngine());

		store.select('image', '/img/a.png');
		store.select('other', '/files/a.pdf');

		expect(store.getSnapshot().selected.image?.path).toBe('/img/a.png');
		expect(store.getSnapshot().selected.other?.path).toBe('/files/a.pdf');
	});
});

describe('FileBrowserStore.deleteFile', () => {
	test('成功したら対象fileTypeのキャッシュを無効化する', async () => {
		const deleteFile = vi.fn().mockResolvedValue({ error: false });
		const getFileList = vi.fn().mockResolvedValue({
			error: false,
			data: [],
			pagination: { current: 0, total: 1 },
		} satisfies FileListResult);
		const store = new FileBrowserStore(createMockEngine({ deleteFile, getFileList }));
		const query = { fileType: 'image', page: 0, filter: '' } as const;
		const before = store.read(query);

		await store.deleteFile('image', '/img/a.png');

		expect(deleteFile).toHaveBeenCalledWith('image', '/img/a.png');
		expect(store.read(query)).not.toBe(before);
	});

	test('サーバーがerror:trueを返したら例外を投げる', async () => {
		const deleteFile = vi.fn().mockResolvedValue({ error: true });
		const store = new FileBrowserStore(createMockEngine({ deleteFile }));

		await expect(store.deleteFile('image', '/img/a.png')).rejects.toThrow(
			'Failed to delete file: /img/a.png',
		);
	});

	test('deleteFileが未設定なら何もしない', async () => {
		const store = new FileBrowserStore(createMockEngine());

		await expect(store.deleteFile('image', '/img/a.png')).resolves.toBeUndefined();
	});
});

describe('FileBrowserStore.upload', () => {
	test('アップロード中はblob URLを選択・uploads配列に載せ、成功後は実URLへ差し替えてuploadsから外す', async () => {
		const uploaded = {
			fileId: '1',
			name: 'a.png',
			url: '/img/uploaded.png',
			size: 2048,
			timestamp: 0,
			sizes: {},
		};
		type UploadResult = {
			error: boolean;
			uploaded: typeof uploaded;
			result: FileListResult;
		};
		let resolveUpload!: (v: UploadResult) => void;
		const postFile = vi.fn(
			(
				_fileType: string,
				_file: File,
				progress: (uploaded: number, total: number) => void,
			): Promise<UploadResult> => {
				progress(50, 100);
				return new Promise((resolve) => {
					resolveUpload = resolve;
				});
			},
		);
		const store = new FileBrowserStore(createMockEngine({ postFile }));
		const file = new File(['x'], 'a.png', { type: 'image/png' });

		const uploadPromise = store.upload('image', file);

		const midFlightSelected = store.getSnapshot().selected.image;
		expect(midFlightSelected?.path.startsWith('blob:')).toBe(true);
		expect(store.getSnapshot().uploads).toHaveLength(1);
		expect(store.getSnapshot().uploads[0]).toMatchObject({ uploaded: 50, total: 100 });

		resolveUpload({
			error: false,
			uploaded,
			result: { error: false, data: [uploaded], pagination: { current: 0, total: 1 } },
		});
		await uploadPromise;

		expect(store.getSnapshot().uploads).toHaveLength(0);
		expect(store.getSnapshot().selected.image).toEqual({
			path: '/img/uploaded.png',
			fileSize: 2048,
		});
	});

	test('失敗してもuploadsからは必ず外れる', async () => {
		const postFile = vi.fn().mockRejectedValue(new Error('network error'));
		const store = new FileBrowserStore(createMockEngine({ postFile }));
		const file = new File(['x'], 'a.png', { type: 'image/png' });

		await expect(store.upload('image', file)).rejects.toThrow('network error');

		expect(store.getSnapshot().uploads).toHaveLength(0);
	});

	test('postFileが未設定なら例外を投げ、uploadsからも外れる', async () => {
		const store = new FileBrowserStore(createMockEngine());
		const file = new File(['x'], 'a.png', { type: 'image/png' });

		await expect(store.upload('image', file)).rejects.toThrow(
			'postFile is not configured',
		);

		expect(store.getSnapshot().uploads).toHaveLength(0);
	});
});
