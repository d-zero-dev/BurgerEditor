import type { ItemData, ItemSeed, FileListResult } from '@burger-editor/core';

import { createMockEngine, renderWithEngine } from '@burger-editor/client/testing';
import { ItemEditorHost } from '@burger-editor/client/ui';
import { Item, UIStateStore } from '@burger-editor/core';
import { narrowElement } from '@burger-editor/utils';
import { screen, fireEvent, cleanup, waitFor, act } from '@testing-library/react';
import { test, expect, describe, afterEach, vi } from 'vitest';

import buttonSeed from '../button/index.js';
import carouselSeed from '../carousel/index.js';
import { appendSlide, defaultSlide } from '../carousel/slides.js';
import downloadFileSeed from '../download-file/index.js';
import imageSeed from '../image/index.js';
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
	['carousel', carouselSeed as never],
	['image', imageSeed as never],
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

	test('carousel: 内側のスライド編集の決定は外側を閉じず、外側の決定でHTMLに反映される', async () => {
		const base = carouselSeed.toEditorState!(
			Item.create('carousel', itemSeeds, testConfig).export() as never,
			testConfig,
		);
		const data = appendSlide(base, { ...defaultSlide(), path: '/b.png', caption: 'B' });
		const { engine, item, uiState } = createHarness('carousel', data, {
			serverAPI: { getFileList: () => resolvedFileList() },
		});
		// 内側のダイアログは engine.el へportalで描かれ、showModal()は接続済みの要素にしか使えない
		document.body.append(engine.el);

		renderWithEngine(engine, <ItemEditorHost item={item as never} />);

		// 内側のダイアログを開いてキャプションを変え、内側の「決定」（内側のform submit）
		const editButton = screen.getByRole('button', { name: 'スライド2を編集' });
		const targetId = editButton.getAttribute('commandfor') ?? '';
		const event = new Event('command');
		Object.assign(event, {
			command: editButton.getAttribute('command'),
			source: editButton,
		});
		await act(() => {
			document.getElementById(targetId)?.dispatchEvent(event);
		});
		const caption = narrowElement(
			await screen.findByLabelText('キャプション'),
			HTMLInputElement,
		);
		fireEvent.change(caption, { target: { value: '変更後' } });
		fireEvent.submit(narrowElement(caption.form ?? document.body, HTMLFormElement));

		// 一覧（外側の state）には反映されるが、保存はされず、外側のダイアログも開いたまま
		await waitFor(() => {
			expect(screen.queryByLabelText('キャプション')).toBeNull();
		});
		expect(uiState.getSnapshot().openDialog?.type).toBe('item-editor');
		expect(engine.save).not.toHaveBeenCalled();
		expect(item.el.querySelectorAll('figcaption')[1]?.textContent).toBe('B');

		// 外側の「決定」でitemのHTMLに反映され、外側が閉じて保存される
		const outerForm = narrowElement(
			document
				.querySelector('[data-bge-component="item-editor-dialog"]')
				?.closest('form') ?? document.body,
			HTMLFormElement,
		);
		fireEvent.submit(outerForm);

		await waitFor(() => {
			expect(item.el.querySelectorAll('figcaption')[1]?.textContent).toBe('変更後');
		});
		expect(uiState.getSnapshot().openDialog).toBeNull();
		expect(engine.save).toHaveBeenCalledTimes(1);
	});

	test('image: リンクがあって alt が空のまま決定すると、理由を出してダイアログを開いたまま、HTMLも保存も変わらない', async () => {
		const base = Item.create('image', itemSeeds, testConfig).export() as Record<
			string,
			unknown
		>;
		const { engine, item, uiState } = createHarness(
			'image',
			// path を空にして、画像の読み込み（失敗の表示）を起こさない
			{ ...base, path: [''], alt: [''], node: 'a', href: 'https://example.com/' },
			{ serverAPI: { getFileList: () => resolvedFileList() } },
		);
		const before = item.el.innerHTML;

		renderWithEngine(engine, <ItemEditorHost item={item as never} />);

		const alt = narrowElement(
			screen.getByLabelText('画像の代替テキスト(alt)'),
			HTMLInputElement,
		);
		expect(alt.getAttribute('aria-required')).toBe('true');
		fireEvent.submit(narrowElement(alt.form ?? document.body, HTMLFormElement));

		expect(await screen.findByText(/^代替テキスト\(alt\)が空です/)).toBeDefined();
		expect(uiState.getSnapshot().openDialog?.type).toBe('item-editor');
		expect(engine.save).not.toHaveBeenCalled();
		expect(item.el.innerHTML).toBe(before);
	});

	test('image: リンクがあっても alt を入れて決定すれば、保存される', async () => {
		const base = Item.create('image', itemSeeds, testConfig).export() as Record<
			string,
			unknown
		>;
		const { engine, item, uiState } = createHarness(
			'image',
			{ ...base, path: [''], alt: [''], node: 'a', href: 'https://example.com/' },
			{ serverAPI: { getFileList: () => resolvedFileList() } },
		);

		renderWithEngine(engine, <ItemEditorHost item={item as never} />);

		const alt = narrowElement(
			screen.getByLabelText('画像の代替テキスト(alt)'),
			HTMLInputElement,
		);
		fireEvent.change(alt, { target: { value: '詳細ページ' } });
		fireEvent.submit(narrowElement(alt.form ?? document.body, HTMLFormElement));

		await waitFor(() => {
			expect(item.el.querySelector('img')?.getAttribute('alt')).toBe('詳細ページ');
		});
		expect(uiState.getSnapshot().openDialog).toBeNull();
		expect(engine.save).toHaveBeenCalledTimes(1);
	});

	test('carousel: 名前の無いスライドがあるまま外側を決定すると、スライドの番号を出してダイアログを開いたまま、HTMLも保存も変わらない', async () => {
		const base = carouselSeed.toEditorState!(
			Item.create('carousel', itemSeeds, testConfig).export() as never,
			testConfig,
		);
		// 2 枚目はキャプションも alt も無い
		const data = appendSlide(base, { ...defaultSlide(), path: '/b.png' });
		const { engine, item, uiState } = createHarness('carousel', data, {
			serverAPI: { getFileList: () => resolvedFileList() },
		});
		document.body.append(engine.el);
		const before = item.el.innerHTML;

		renderWithEngine(engine, <ItemEditorHost item={item as never} />);

		const outerForm = narrowElement(
			document
				.querySelector('[data-bge-component="item-editor-dialog"]')
				?.closest('form') ?? document.body,
			HTMLFormElement,
		);
		fireEvent.submit(outerForm);

		expect(
			await screen.findByText(/^スライド2: キャプションも代替テキスト\(alt\)も空です/),
		).toBeDefined();
		expect(uiState.getSnapshot().openDialog?.type).toBe('item-editor');
		expect(engine.save).not.toHaveBeenCalled();
		expect(item.el.innerHTML).toBe(before);
	});
});
