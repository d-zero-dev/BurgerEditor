import type {
	FileListItem,
	FileListResult,
	FileRequestOptions,
} from '@burger-editor/core';

import { screen, act, cleanup, fireEvent } from '@testing-library/react';
import { test, expect, afterEach, beforeEach, vi } from 'vitest';

import { FileList } from '../components/file-list.js';
import { getFileBrowserStore } from '../file-browser/store.js';
import { createMockEngine as createBaseMockEngine } from '../testing/create-mock-engine.js';
import { renderWithEngine } from '../testing/render-with-engine.js';
import { suppressConsoleErrors } from '../testing/suppress-console-error.js';

// vitestはglobals無効のためtesting-libraryの自動cleanupが効かない。
// レンダー結果がテスト間でリークしないよう明示的に登録する
afterEach(cleanup);

const scrollIntoView = vi.fn();

// ページ送り・検索によるstartTransition経由の再読み込みは、既に
// fulfilledタグ付け済みのthenable（use()のキャッシュ契約）を読むだけで
// 実際には待ちが発生しないにもかかわらず、Reactが「本当にSuspenseの
// 再開を待っていた場合」用の警告を誤検知することがある。このファイルに
// 限定してノイズだけを黙らせる
suppressConsoleErrors([
	'A suspended resource finished loading inside a test, but the event was not wrapped in act',
]);

beforeEach(() => {
	// scrollIntoViewの呼び出しをspyで検証するため差し替える
	Element.prototype.scrollIntoView = scrollIntoView;
	scrollIntoView.mockClear();
});

/**
 * FileListItemのフィクスチャ
 * @param url - ファイルURL
 */
function createFile(url: string): FileListItem {
	return {
		fileId: url,
		name: url,
		size: 1024,
		timestamp: 1_700_000_000_000,
		url,
		sizes: {},
	};
}

/**
 * Suspenseの再開（pending→fulfilledへの遷移をReactが自動でping/retry
 * する過程）は実Chromium/Vitest Browser Modeでも安定して拾えないことを
 * 最小再現で確認済み（jsdom固有の制約ではない）。そのため
 * FileListが読む`getFileList`は最初から解決済みのthenable（use()の
 * キャッシュ契約 — status/valueを事前に持つと同期的に値を返す）を返す
 * @param files - 返却するファイル一覧
 * @param pagination - 現在ページ・総ページ数（省略時は単一ページ）
 * @param pagination.current - 現在ページ
 * @param pagination.total - 総ページ数
 */
function resolvedFileList(
	files: readonly FileListItem[],
	pagination?: { current: number; total: number },
): Promise<FileListResult> {
	const result: FileListResult = {
		error: false,
		data: files,
		pagination: pagination ?? { current: 0, total: 1 },
	};
	const resolved = Promise.resolve(result) as Promise<FileListResult> & {
		status?: 'fulfilled';
		value?: FileListResult;
	};
	resolved.status = 'fulfilled';
	resolved.value = result;
	return resolved;
}

/**
 * ページ・検索語ごとに異なる応答を返すengineモック。paginate/検索の
 * `FileBrowserStore`統合（`use()`配線経由でFileListに反映されること）を
 * 検証するために使う
 * @param pages - ページ番号ごとのファイル一覧
 * @param totalPages - 総ページ数
 */
function createPaginatingMockEngine(
	pages: Record<number, readonly FileListItem[]>,
	totalPages: number,
) {
	const getFileList = vi.fn((_fileType: string, options: FileRequestOptions) =>
		resolvedFileList(pages[options.page] ?? [], {
			current: options.page,
			total: totalPages,
		}),
	);
	const engine = createBaseMockEngine({ serverAPI: { getFileList } });
	return { engine, getFileList };
}

/**
 * `commandfor`先へ合成commandイベントを送ってボタン起動を再現する
 * @param button
 */
function invokeCommand(button: HTMLElement) {
	const targetId = button.getAttribute('commandfor');
	const target = targetId ? document.getElementById(targetId) : null;
	if (!target) {
		throw new Error('commandfor target not found');
	}
	const event = new Event('command');
	Object.assign(event, { command: button.getAttribute('command'), source: button });
	act(() => {
		target.dispatchEvent(event);
	});
}

/**
 * getFileList応答を固定したengineモック
 * @param files - 返却するファイル一覧
 */
function createMockEngine(files: readonly FileListItem[]) {
	const getFileList = vi.fn(() => resolvedFileList(files));
	const engine = createBaseMockEngine({ serverAPI: { getFileList } });
	return { engine, getFileList };
}

/**
 * `postFile`が解決しないengineモックを作る。返り値の`reportProgress`で
 * `FileBrowserStore.upload()`内部の進捗コールバックを外側から起動できる
 * @param files - 初期のファイル一覧
 */
function createUploadableMockEngine(files: readonly FileListItem[]) {
	const getFileList = vi.fn(() => resolvedFileList(files));
	let onProgress: ((uploaded: number, total: number) => void) | undefined;
	const postFile = vi.fn(
		(
			_fileType: string,
			_file: File,
			progress: (uploaded: number, total: number) => void,
		) => {
			onProgress = progress;
			return new Promise(() => {
				/* 意図的に解決しない — このテストではアップロード完了までは検証しない */
			});
		},
	);
	const engine = createBaseMockEngine({ serverAPI: { getFileList, postFile } });
	return {
		engine,
		reportProgress: (uploaded: number, total: number) => onProgress?.(uploaded, total),
	};
}

test('選択中のファイルボタンがマウントされたらscrollIntoViewされる', async () => {
	const { engine } = createMockEngine([
		createFile('/img/a.png'),
		createFile('/img/b.png'),
	]);
	renderWithEngine(engine, <FileList fileType="image" />);

	act(() => {
		getFileBrowserStore(engine).select('image', '/img/b.png');
	});

	const selected = await screen.findByRole('button', { pressed: true });
	expect(selected.getAttribute('value')).toBe('/img/b.png');
	expect(scrollIntoView).toHaveBeenCalledTimes(1);
});

test('引用符を含むURLでも例外なく選択・スクロールできる', async () => {
	const url = '/img/we"ird.png';
	const { engine } = createMockEngine([createFile(url)]);
	renderWithEngine(engine, <FileList fileType="image" />);

	act(() => {
		getFileBrowserStore(engine).select('image', url);
	});

	const selected = await screen.findByRole('button', { pressed: true });
	expect(selected.getAttribute('value')).toBe(url);
	expect(scrollIntoView).toHaveBeenCalledTimes(1);
});

test('アップロード進捗の再レンダーでscrollIntoViewが再発火しない', async () => {
	const { engine, reportProgress } = createUploadableMockEngine([
		createFile('/img/a.png'),
	]);
	renderWithEngine(engine, <FileList fileType="image" />);

	const file = new File(['x'], 'photo.png', { type: 'image/png' });
	act(() => {
		void getFileBrowserStore(engine).upload('image', file);
	});

	await screen.findByRole('button', { pressed: true });
	expect(scrollIntoView).toHaveBeenCalledTimes(1);

	act(() => {
		reportProgress(50, 100);
	});
	act(() => {
		reportProgress(80, 100);
	});

	// 進捗更新のたびにrefが付け直されるとスクロールが繰り返される
	expect(scrollIntoView).toHaveBeenCalledTimes(1);
});

test('「次へ」でページ送りするとuse()配線経由で次ページのデータに切り替わる', async () => {
	const { engine, getFileList } = createPaginatingMockEngine(
		{ 0: [createFile('/img/page0.png')], 1: [createFile('/img/page1.png')] },
		2,
	);
	renderWithEngine(engine, <FileList fileType="image" />);

	expect(screen.getByRole('button', { name: /page0\.png/ })).toBeTruthy();

	invokeCommand(screen.getByRole('button', { name: '次へ' }));

	await screen.findByRole('button', { name: /page1\.png/ });
	expect(screen.queryByRole('button', { name: /page0\.png/ })).toBeNull();
	expect(getFileList).toHaveBeenCalledWith('image', { page: 1, filter: '' });
});

test('検索語を入力するとuse()配線経由でfilterがgetFileListへ渡る', async () => {
	const { engine, getFileList } = createPaginatingMockEngine(
		{ 0: [createFile('/img/a.png')] },
		1,
	);
	renderWithEngine(engine, <FileList fileType="image" />);

	fireEvent.change(screen.getByPlaceholderText('検索'), { target: { value: 'a.png' } });

	await vi.waitFor(() => {
		expect(getFileList).toHaveBeenCalledWith('image', { page: 0, filter: 'a.png' });
	});
});

test('ファイルを選択するとstore.selectへ反映されボタンがpressedになる', () => {
	const { engine } = createMockEngine([
		createFile('/img/a.png'),
		createFile('/img/b.png'),
	]);
	renderWithEngine(engine, <FileList fileType="image" />);

	invokeCommand(screen.getByRole('button', { name: /b\.png/ }));

	expect(getFileBrowserStore(engine).getSnapshot().selected['image']?.path).toBe(
		'/img/b.png',
	);
	expect(
		screen.getByRole('button', { name: /b\.png/ }).getAttribute('aria-pressed'),
	).toBe('true');
});

test('削除に成功するとstore.deleteFile経由でリストが再取得される', async () => {
	const files = [createFile('/img/a.png')];
	const deleteFile = vi.fn().mockResolvedValue({ error: false });
	const getFileList = vi.fn(() => resolvedFileList(files));
	const engine = createBaseMockEngine({ serverAPI: { getFileList, deleteFile } });
	renderWithEngine(engine, <FileList fileType="image" />);

	invokeCommand(screen.getByRole('button', { name: '削除' }));

	await vi.waitFor(() => {
		expect(deleteFile).toHaveBeenCalledWith('image', '/img/a.png');
	});
	// invalidate()後の再取得を検証する（初回read + invalidate後のread）
	await vi.waitFor(() => {
		expect(getFileList).toHaveBeenCalledTimes(2);
	});
});

test('削除に失敗するとalertで通知されファイルは一覧に残る', async () => {
	const files = [createFile('/img/a.png')];
	const deleteFile = vi.fn().mockResolvedValue({ error: true });
	const getFileList = vi.fn(() => resolvedFileList(files));
	const engine = createBaseMockEngine({ serverAPI: { getFileList, deleteFile } });
	const alertMock = vi.fn();
	vi.stubGlobal('alert', alertMock);
	renderWithEngine(engine, <FileList fileType="image" />);

	invokeCommand(screen.getByRole('button', { name: '削除' }));

	await vi.waitFor(() => {
		expect(alertMock).toHaveBeenCalledWith('ファイルの削除に失敗しました。');
	});
	expect(screen.getByRole('button', { name: /a\.png/ })).toBeTruthy();
	vi.unstubAllGlobals(); // cspell:disable-line
});
