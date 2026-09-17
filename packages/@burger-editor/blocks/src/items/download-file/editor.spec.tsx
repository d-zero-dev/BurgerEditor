import type {
	FileListResult,
	BurgerEditorEngine,
	Item,
	ItemEditorProps,
} from '@burger-editor/core';
import type { ComponentType } from 'react';

import { createMockEngine as createBaseMockEngine } from '@burger-editor/client/testing';
import { EngineProvider } from '@burger-editor/client/ui';
import { render, cleanup, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { test, expect, describe, afterEach } from 'vitest';

import downloadFileItemSeed from './index.js';

/**
 * Suspenseの再開（pending→fulfilledへの遷移をReactが自動でping/retry
 * する過程）は実Chromium/Vitest Browser Modeでも安定して拾えないことを
 * 最小再現で確認済み（jsdom固有の制約ではない）。そのため
 * FileListが読む`getFileList`は最初から解決済みのthenable（use()の
 * キャッシュ契約 — status/valueを事前に持つと同期的に値を返す）を返す
 */
function resolvedFileList(): Promise<FileListResult> {
	const result: FileListResult = {
		error: false,
		data: [],
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
 *
 */
function createMockEngine() {
	return createBaseMockEngine({ serverAPI: { getFileList: () => resolvedFileList() } });
}

type DownloadFileData = typeof downloadFileItemSeed._;

/**
 * state/setStateを実際のReact stateとして供給するテストハーネス
 * @param root0
 * @param root0.engine
 * @param root0.path
 * @param root0.onState
 */
function Harness({
	engine,
	path,
	onState,
}: {
	readonly engine: BurgerEditorEngine;
	readonly path: string;
	readonly onState?: (state: DownloadFileData) => void;
}) {
	const [state, setState] = useState<DownloadFileData>(() => ({
		path,
		download: '',
		name: path,
		formatedSize: '0B',
		size: '0',
		downloadCheck: false,
	}));
	onState?.(state);
	// item-editor-host.tsxが実際にEditorを描画する際と同じキャスト規約
	// （ItemEditorComponentの戻り値unknownをJSXコンポーネントとして扱う）。
	// downloadFileItemSeedは具体的なdata型で作られているため、item-editor-
	// host.tsx側の（ItemData汎用の）キャストとは異なり具体型を指定する
	const Editor = downloadFileItemSeed.Editor as ComponentType<
		ItemEditorProps<DownloadFileData, {}, DownloadFileData>
	>;
	return (
		<EngineProvider engine={engine}>
			<Editor
				state={state}
				setState={setState}
				item={{} as unknown as Item<DownloadFileData, {}>}
			/>
		</EngineProvider>
	);
}

// vitestはglobals無効のためtesting-libraryの自動cleanupが効かない。
// レンダー結果がテスト間でリークしないよう明示的に登録する
afterEach(cleanup);

describe('engine単位で共有されるFileBrowserStoreの残留選択（regression）', () => {
	test('別itemの選択が残っていても、マウント直後は自分のpathのまま変わらない', async () => {
		const engine = createMockEngine();

		// item A（/files/a.pdf）をマウントして選択を確定させる（マウント時の
		// effectがengine共有のFileBrowserStore.selected.otherを
		// /files/a.pdfにする）
		let latestA: DownloadFileData | undefined;
		const { unmount } = render(
			<Harness engine={engine} path="/files/a.pdf" onState={(s) => (latestA = s)} />,
		);
		await waitFor(() => {
			expect(latestA?.path).toBe('/files/a.pdf');
		});
		unmount();

		// 別item B（/files/b.pdf）を同じengineでマウントする
		let latestB: DownloadFileData | undefined;
		render(
			<Harness engine={engine} path="/files/b.pdf" onState={(s) => (latestB = s)} />,
		);

		// effect群が落ち着くまで実時間で待ち、item Aの残留選択
		// （/files/a.pdf）でBのpathが上書きされていないことを確認する
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(latestB?.path).toBe('/files/b.pdf');
	});
});
