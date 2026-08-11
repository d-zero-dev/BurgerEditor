import type { BurgerEditorEngine, FileListItem } from '@burger-editor/core';

import { ComponentObserver } from '@burger-editor/core';
import { render, screen, act, cleanup } from '@testing-library/react';
import { test, expect, afterEach, beforeEach, vi } from 'vitest';

import { FileList } from '../components/file-list.js';

// vitestはglobals無効のためtesting-libraryの自動cleanupが効かない。
// レンダー結果がテスト間でリークしないよう明示的に登録する
afterEach(cleanup);

const scrollIntoView = vi.fn();

beforeEach(() => {
	// jsdomはscrollIntoView未実装
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
 * getFileList応答を固定したengineモック
 * @param files - 返却するファイル一覧
 */
function createMockEngine(files: readonly FileListItem[]) {
	const getFileList = vi.fn().mockResolvedValue({
		data: files,
		pagination: { current: 0, total: 1 },
	});
	const engine = {
		componentObserver: new ComponentObserver(),
		serverAPI: { getFileList },
	} as unknown as BurgerEditorEngine;
	return { engine, getFileList };
}

/**
 * file-selectを通知しReactの更新を待つ
 * @param engine - エンジンモック
 * @param path - 選択するファイルURL
 * @param isMounted - 初回マウント時通知（false）か選択操作（true）か
 */
async function notifyFileSelect(
	engine: BurgerEditorEngine,
	path: string,
	isMounted: boolean,
) {
	await act(async () => {
		engine.componentObserver.notify('file-select', {
			path,
			fileSize: 0,
			isEmpty: false,
			isMounted,
		});
		// 非同期ハンドラ（getFileList → setState）の完了を待つ
		await Promise.resolve();
	});
}

test('選択中のファイルボタンがマウントされたらscrollIntoViewされる', async () => {
	const { engine } = createMockEngine([
		createFile('/img/a.png'),
		createFile('/img/b.png'),
	]);
	render(<FileList engine={engine} fileType="image" />);

	await notifyFileSelect(engine, '/img/b.png', false);

	const selected = await screen.findByRole('button', { pressed: true });
	expect(selected.getAttribute('value')).toBe('/img/b.png');
	expect(scrollIntoView).toHaveBeenCalledTimes(1);
});

test('引用符を含むURLでも例外なく選択・スクロールできる', async () => {
	const url = '/img/we"ird.png';
	const { engine } = createMockEngine([createFile(url)]);
	render(<FileList engine={engine} fileType="image" />);

	await notifyFileSelect(engine, url, false);

	const selected = await screen.findByRole('button', { pressed: true });
	expect(selected.getAttribute('value')).toBe(url);
	expect(scrollIntoView).toHaveBeenCalledTimes(1);
});

test('アップロード進捗の再レンダーでscrollIntoViewが再発火しない', async () => {
	const blobUrl = 'blob:https://example.com/upload';
	const { engine } = createMockEngine([createFile('/img/a.png')]);
	render(<FileList engine={engine} fileType="image" />);

	await notifyFileSelect(engine, blobUrl, false);
	expect(scrollIntoView).toHaveBeenCalledTimes(1);

	await act(async () => {
		engine.componentObserver.notify('file-upload-progress', {
			blob: blobUrl,
			uploaded: 50,
			total: 100,
		});
		await Promise.resolve();
	});
	await act(async () => {
		engine.componentObserver.notify('file-upload-progress', {
			blob: blobUrl,
			uploaded: 80,
			total: 100,
		});
		await Promise.resolve();
	});

	// 進捗更新のたびにrefが付け直されるとスクロールが繰り返される
	expect(scrollIntoView).toHaveBeenCalledTimes(1);
});
