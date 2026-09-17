import type { ItemData, ItemSeed, FileListResult } from '@burger-editor/core';

import { createMockEngine, renderWithEngine } from '@burger-editor/client/testing';
import { ItemEditorHost } from '@burger-editor/client/ui';
import { Item, UIStateStore } from '@burger-editor/core';
import { narrowElement } from '@burger-editor/utils';
import { screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { test, expect, describe, afterEach, vi } from 'vitest';

import buttonSeed from '../button/index.js';
import downloadFileSeed from '../download-file/index.js';
import titleH2Seed from '../title-h2/index.js';

afterEach(cleanup);

const testConfig = {
	classList: [],
	googleMapsApiKey: null,
	sampleImagePath: '/img/sample.png',
	sampleFilePath: '/pdf/sample.pdf',
	stylesheets: [],
} as const;

const itemSeeds = new Map<string, ItemSeed>([
	['title-h2', titleH2Seed as never],
	['button', buttonSeed as never],
	['download-file', downloadFileSeed as never],
]);

/**
 * Suspenseの再開（pending→fulfilledへの遷移をReactが自動でping/retryする
 * 過程）は実Chromium/Vitest Browser Modeでも安定して拾えないことを確認済み
 * （download-file/editor.spec.tsx参照）。そのためFileListが読む
 * `getFileList`は最初から解決済みのthenable（use()のキャッシュ契約 —
 * status/valueを事前に持つと同期的に値を返す）を返す
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
 * item種別・初期データを差し替えられる共通ハーネス。
 * @param name - itemSeedsに登録済みのitem名
 * @param data - item.export()が返す初期データ（保存済みの生データ）
 * @param engineOverrides - createMockEngineへ追加で差し込むオーバーライド
 * （download-fileのFileBrowserStore経由の`getFileList`等）
 */
function createHarness<T extends ItemData>(
	name: string,
	data: T,
	engineOverrides: Record<string, unknown> = {},
) {
	const uiState = new UIStateStore();
	const engine = createMockEngine({
		uiState,
		save: vi.fn(),
		config: testConfig,
		getContentStylesheet: vi.fn().mockResolvedValue(''),
		...engineOverrides,
	});

	const item = Item.create<T, {}>(name, itemSeeds, testConfig, data);
	uiState.openItemEditor(item as never);

	return { engine, item, uiState };
}

describe('itemエディタのパイプライン統合（開く→編集→保存）', () => {
	test('itemのデータがEditorに表示され、決定でtoItemData経由でitemに書き戻される', async () => {
		const { engine, item, uiState } = createHarness('title-h2', { titleH2: '旧見出し' });

		renderWithEngine(engine, <ItemEditorHost item={item as never} />);

		// item.export() の内容がエディタの初期値になる
		const input = narrowElement(
			screen.getByPlaceholderText('見出しを入力してください'),
			HTMLInputElement,
		);
		expect(input.value).toBe('旧見出し');

		fireEvent.change(input, { target: { value: '新見出し' } });

		// dialogIdはuseIdベースで実行ごとに変わるため、inputが属するformを
		// HTMLInputElement.formで辿る（IDセレクタに依存しない）
		const form = narrowElement(input.form ?? document.body, HTMLFormElement);
		fireEvent.submit(form);

		// 決定でitemのコンテンツDOM（frozen-patty形式）が更新される
		await waitFor(() => {
			expect(item.el.querySelector('[data-bge="title-h2"]')?.textContent).toBe(
				'新見出し',
			);
		});
		expect(uiState.getSnapshot().openDialog).toBeNull();
	});

	test('キャンセル（dialogのclose）ではitemが変更されずsaveだけ走る', () => {
		const { engine, item } = createHarness('title-h2', { titleH2: '旧見出し' });

		renderWithEngine(engine, <ItemEditorHost item={item as never} />);

		const input = narrowElement(
			screen.getByPlaceholderText('見出しを入力してください'),
			HTMLInputElement,
		);
		fireEvent.change(input, { target: { value: '破棄される編集' } });

		const dialog = narrowElement(
			document.querySelector('dialog') ?? document.body,
			HTMLDialogElement,
		);
		fireEvent(dialog, new Event('close'));

		expect(item.el.querySelector('[data-bge="title-h2"]')?.textContent).toBe('旧見出し');
		expect(engine.save).toHaveBeenCalledTimes(1);
	});

	// button・download-fileは、engine propドリルの廃止（EngineContext）や
	// FileBrowserStore（download-fileの場合）を実際に経由する形でパイプライン
	// 全体を検証する。google-mapsはgoogle.maps JS APIそのものへの依存が
	// 大きく、このパイプライン統合テストの範囲では検証しない（item自体の
	// toItemData変換はgoogle-maps/index.spec.tsで別途検証済み）
	test('button: URLを編集すると決定でaのhrefへ書き戻される', async () => {
		const { engine, item, uiState } = createHarness('button', {
			link: '/old',
			target: '',
			text: 'ボタン',
			subtext: '',
			kind: 'primary',
			beforeIcon: 'none',
			afterIcon: 'none',
		});

		renderWithEngine(engine, <ItemEditorHost item={item as never} />);

		const input = narrowElement(screen.getByLabelText('URL'), HTMLInputElement);
		expect(input.value).toBe('/old');
		fireEvent.change(input, { target: { value: '/new' } });

		const form = narrowElement(input.form ?? document.body, HTMLFormElement);
		fireEvent.submit(form);

		await waitFor(() => {
			expect(item.el.querySelector('a')?.getAttribute('href')).toBe('/new');
		});
		expect(uiState.getSnapshot().openDialog).toBeNull();
	});

	test('download-file: 表示ファイル名を編集すると決定でnameへ書き戻される', async () => {
		const { engine, item, uiState } = createHarness(
			'download-file',
			{
				path: '/files/old.pdf',
				download: '',
				name: '旧ファイル名',
				formatedSize: '0B',
				size: '0',
				downloadCheck: false,
			},
			{ serverAPI: { getFileList: () => resolvedFileList() } },
		);

		renderWithEngine(engine, <ItemEditorHost item={item as never} />);

		const input = narrowElement(
			screen.getByLabelText('表示ファイル名'),
			HTMLInputElement,
		);
		expect(input.value).toBe('旧ファイル名');
		fireEvent.change(input, { target: { value: '新ファイル名' } });

		const form = narrowElement(input.form ?? document.body, HTMLFormElement);
		fireEvent.submit(form);

		await waitFor(() => {
			expect(item.el.querySelector('[data-bge="name"]')?.textContent).toBe(
				'新ファイル名',
			);
		});
		expect(uiState.getSnapshot().openDialog).toBeNull();
	});
});
