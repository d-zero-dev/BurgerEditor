import type { FileListItem, FileListResult } from '@burger-editor/core';

import { screen, act, cleanup } from '@testing-library/react';
import { test, expect, afterEach, beforeEach, vi } from 'vitest';

import { FileList } from '../components/file-list.js';
import { getFileBrowserStore } from '../file-browser/store.js';
import { createMockEngine as createBaseMockEngine } from '../testing/create-mock-engine.js';
import { renderWithEngine } from '../testing/render-with-engine.js';

// vitestはglobals無効のためtesting-libraryの自動cleanupが効かない。
// レンダー結果がテスト間でリークしないよう明示的に登録する
afterEach(cleanup);

const scrollIntoView = vi.fn();

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
 */
function resolvedFileList(files: readonly FileListItem[]): Promise<FileListResult> {
	const result: FileListResult = {
		error: false,
		data: files,
		pagination: { current: 0, total: 1 },
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
