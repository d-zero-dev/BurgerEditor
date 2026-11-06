import type { ImageData } from './definition.js';
import type { ImageEditorProps } from './editor.js';
import type {
	BurgerEditorEngine,
	FileListResult,
	ItemData,
	Item,
} from '@burger-editor/core';

import { createMockEngine as createBaseMockEngine } from '@burger-editor/client/testing';
import { EngineProvider } from '@burger-editor/client/ui';
import { narrowElement } from '@burger-editor/utils';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { useState } from 'react';
import { test, expect, describe, beforeEach, afterEach, vi } from 'vitest';

import { ImageEditor } from './editor.js';

import imageItemSeed from './index.js';

const testConfig = {
	classList: [],
	googleMapsApiKey: null,
	sampleImagePath: '/img/sample.png',
	sampleFilePath: '/pdf/sample.pdf',
	stylesheets: [],
} as const;

/**
 * 2枚構成の初期エディタ状態。デフォルトはpathを空にして画像ロードの
 * リクエスト自体を発生させず（実ブラウザ実行でもネットワーク依存を
 * 作らないため）、サイズ用fieldsetが無効化されないようにする
 * @param path
 */
function createInitialState(path: string[] = ['', '']): ImageData {
	return imageItemSeed.toEditorState!(
		{
			path,
			alt: ['Aの説明', 'Bの説明'],
			width: [400, 400],
			height: [300, 300],
			media: ['', '(min-width: 768px)'],
			loading: ['eager'],
			fileSize: '0',
			mediaInput: '',
			style: '',
			cssWidth: '100px',
			scaleType: 'original',
			scale: 100,
			aspectRatio: 'revert',
			cssWidthNumber: 100,
			cssWidthUnit: 'px',
			lazy: false,
			caption: '',
			altEditable: '',
			node: 'div',
			href: '',
			popup: false,
			target: null,
			targetBlank: false,
			command: null,
		},
		testConfig,
	);
}

/**
 * 実Chromium（Baseline 2025）はInvoker Commands APIをネイティブ実装
 * 済みだが、他spec群と実装を揃えるためここでも意図的にcommandfor先へ
 * 合成commandイベントを送ってボタン起動を再現する（実クリック駆動への
 * 切り替えは別スコープと判断し見送り済み）
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

/**
 * state/setStateを実際のReact stateとして供給するテストハーネス。
 * `onState` を渡すと最新の state をレンダーのたびにテスト側へ渡せる
 * （間接的な通知を経由せず、state遷移を直接assertする）
 * @param root0
 * @param root0.engine
 * @param root0.initialPath
 * @param root0.onState
 * @param root0.slideName
 */
function Harness({
	engine,
	initialPath,
	onState,
	slideName,
}: {
	readonly engine: BurgerEditorEngine;
	readonly initialPath?: string[];
	readonly onState?: (state: ImageData) => void;
	readonly slideName?: ImageEditorProps['slideName'];
}) {
	const [state, setState] = useState<ImageData>(() => createInitialState(initialPath));
	onState?.(state);
	return (
		<EngineProvider engine={engine}>
			<ImageEditor
				state={state}
				setState={setState}
				item={{} as never}
				slideName={slideName}
			/>
		</EngineProvider>
	);
}

/**
 * label文字列からinput要素を型安全に取得する
 * @param label
 */
function getInput(label: string): HTMLInputElement {
	return narrowElement(screen.getByLabelText(label), HTMLInputElement, label);
}

/**
 * srcを設定してもload/errorイベントを一切発火しない`Image`スタブ。
 * disabled状態や注記表示など同期的なUI検証だけを行うテストで、
 * 実ブラウザへの画像読み込みリクエスト（成功・失敗いずれのタイミングも
 * 非同期でact()外の再レンダーを起こしうる）を避けるために使う
 */
class SilentImage extends EventTarget {
	naturalHeight = 100;
	naturalWidth = 100;

	set src(_value: string) {
		// 意図的に何もしない
	}
}

// vitestはglobals無効のためtesting-libraryの自動cleanupが効かない。
// レンダー結果がテスト間でリークしないよう明示的に登録する
afterEach(cleanup);

describe('ImageEditor', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
		vi.stubGlobal('Image', SilentImage);
	});

	afterEach(() => {
		vi.unstubAllGlobals(); // cspell:disable-line
	});

	test('タブ切替でメディアクエリーは選択画像の値に更新され、altは画像1の値のまま無効化される', () => {
		// altは<source>要素に持てないためimg（画像1）にしか反映されない。
		// タブ2でも画像1のaltEditableをそのまま表示し、編集は無効化する
		render(<Harness engine={createMockEngine()} initialPath={['', '/img/sp.png']} />);

		const altInput = getInput('画像の代替テキスト(alt)');
		const mediaInput = getInput('メディアクエリー');
		expect(altInput.value).toBe('Aの説明');
		expect(altInput.disabled).toBe(false);
		expect(screen.getByRole('tabpanel', { name: '画像1' })).toBeTruthy();

		invokeCommand(screen.getByRole('tab', { name: '画像2' }));

		expect(altInput.value).toBe('Aの説明');
		expect(altInput.disabled).toBe(true);
		expect(mediaInput.value).toBe('(min-width: 768px)');
		expect(mediaInput.disabled).toBe(false);
		expect(screen.getByRole('tabpanel', { name: '画像2' })).toBeTruthy();

		invokeCommand(screen.getByRole('tab', { name: '画像1' }));

		expect(altInput.value).toBe('Aの説明');
		expect(altInput.disabled).toBe(false);
		expect(mediaInput.disabled).toBe(true);
		expect(screen.getByRole('tabpanel', { name: '画像1' })).toBeTruthy();
	});

	test('画像1の media が候補と同じ値でも、画像1のタブには無効な入力欄を出す（タブで欄が消えない）', () => {
		/**
		 * 画像1の media に既定の候補を持つ状態
		 */
		function WithCandidateMedia() {
			const [state, setState] = useState<ImageData>(() => ({
				...createInitialState(),
				media: ['(max-width: 767px)', ''],
				mediaInput: '(max-width: 767px)',
			}));
			return (
				<EngineProvider engine={createMockEngine()}>
					<ImageEditor state={state} setState={setState} item={{} as never} />
				</EngineProvider>
			);
		}
		render(<WithCandidateMedia />);

		const mediaInput = getInput('メディアクエリー');
		expect(mediaInput.disabled).toBe(true);
		expect(screen.queryByLabelText('メディアクエリーの候補')).toBeNull();
	});

	test('タブ2ではalt欄が無効化され、画像1で編集する旨の注記が表示される', () => {
		render(<Harness engine={createMockEngine()} initialPath={['', '/img/sp.png']} />);

		const altInput = getInput('画像の代替テキスト(alt)');
		expect(altInput.getAttribute('aria-describedby')).toBeNull();
		expect(screen.queryByText(/画像1のタブで編集/)).toBeNull();

		invokeCommand(screen.getByRole('tab', { name: '画像2' }));

		expect(altInput.disabled).toBe(true);
		const note = screen.getByText(/画像1のタブで編集/);
		expect(altInput.getAttribute('aria-describedby')).toBe(note.id);
	});

	test('alt編集はaltEditable（画像1用の値）に書き込まれる', () => {
		let latestState: ImageData | undefined;

		render(
			<Harness
				engine={createMockEngine()}
				initialPath={['', '/img/sp.png']}
				onState={(state) => (latestState = state)}
			/>,
		);

		const altInput = getInput('画像の代替テキスト(alt)');
		fireEvent.change(altInput, { target: { value: '新しい説明' } });

		expect(latestState?.altEditable).toBe('新しい説明');
	});

	test('タブ2で画像が未選択の間はメディアクエリー欄が無効化され注記が出る', () => {
		render(<Harness engine={createMockEngine()} />);

		invokeCommand(screen.getByRole('tab', { name: '画像2' }));

		const mediaInput = getInput('メディアクエリー');
		expect(mediaInput.disabled).toBe(true);
		const note = screen.getByText(/先に画像を選択/);
		expect(mediaInput.getAttribute('aria-describedby')).toBe(note.id);
	});

	test('タブ2で画像が選択済みならメディアクエリー欄が有効になる', () => {
		render(<Harness engine={createMockEngine()} initialPath={['', '/img/sp.png']} />);

		invokeCommand(screen.getByRole('tab', { name: '画像2' }));

		const mediaInput = getInput('メディアクエリー');
		expect(mediaInput.disabled).toBe(false);
		expect(mediaInput.getAttribute('aria-describedby')).toBeNull();
		expect(screen.queryByText(/先に画像を選択/)).toBeNull();
	});

	test('基準をコンテナに切り替えると単位がcqiになる', () => {
		render(<Harness engine={createMockEngine()} />);

		fireEvent.click(screen.getByLabelText('基準', { selector: 'input' }));

		const output = document.querySelector(
			'output[name="bge-css-width-unit"]',
		) as HTMLOutputElement;
		expect(output.textContent).toBe('cqi');

		fireEvent.click(screen.getByLabelText('画像基準'));
		expect(output.textContent).toBe('px');
	});

	test('幅の数値変更でcssWidthが更新される', () => {
		let latestState: ImageData | undefined;

		render(
			<Harness engine={createMockEngine()} onState={(state) => (latestState = state)} />,
		);

		const numberInput = screen.getByLabelText('幅', {
			selector: 'input[type="number"]',
		});
		fireEvent.change(numberInput, { target: { value: '250' } });

		expect(latestState?.cssWidth).toBe('250px');
	});

	test('ポップアップを有効にするとリンク先URLと別タブが無効化される', () => {
		render(<Harness engine={createMockEngine()} />);

		const href = getInput('リンク先URL');
		const targetBlank = getInput('別タブで開く');
		expect(href.disabled).toBe(false);

		fireEvent.click(screen.getByLabelText('ポップアップで画像を開く'));

		expect(href.disabled).toBe(true);
		expect(targetBlank.disabled).toBe(true);
	});

	test('リンクもポップアップも無いときは、alt欄は必須にならず説明も出ない', () => {
		render(<Harness engine={createMockEngine()} />);

		const altInput = getInput('画像の代替テキスト(alt)');
		expect(altInput.getAttribute('aria-required')).toBeNull();
		expect(altInput.getAttribute('aria-describedby')).toBeNull();
		expect(screen.queryByText(/リンクやボタンの名前になるため必須/)).toBeNull();
	});

	test('リンク先URLを入れるとalt欄が必須になり、説明がaria-describedbyでつながる', () => {
		render(<Harness engine={createMockEngine()} />);

		fireEvent.change(getInput('リンク先URL'), {
			target: { value: 'https://example.com/' },
		});

		const altInput = getInput('画像の代替テキスト(alt)');
		expect(altInput.getAttribute('aria-required')).toBe('true');
		const note = screen.getByText(/リンクやボタンの名前になるため必須/);
		expect(altInput.getAttribute('aria-describedby')).toBe(note.id);
	});

	test('ポップアップを有効にするとalt欄が必須になり、無効に戻すと必須でなくなる', () => {
		render(<Harness engine={createMockEngine()} />);
		const altInput = getInput('画像の代替テキスト(alt)');

		fireEvent.click(screen.getByLabelText('ポップアップで画像を開く'));
		expect(altInput.getAttribute('aria-required')).toBe('true');
		expect(screen.queryByText(/リンクやボタンの名前になるため必須/)).not.toBeNull();

		fireEvent.click(screen.getByLabelText('ポップアップで画像を開く'));
		expect(altInput.getAttribute('aria-required')).toBeNull();
		expect(screen.queryByText(/リンクやボタンの名前になるため必須/)).toBeNull();
	});

	describe('スライドとして編集するとき（slideName）', () => {
		const slideName = {
			labelOf: (state: ImageData) => state.caption || state.altEditable,
			note: 'スライドの名前の説明',
		};

		test('キャプションも alt も空のあいだ、2つの欄に説明が出てつながる', () => {
			render(<Harness engine={createMockEngine()} slideName={slideName} />);
			fireEvent.change(getInput('画像の代替テキスト(alt)'), { target: { value: '' } });

			const note = screen.getByText('スライドの名前の説明');
			expect(getInput('画像の代替テキスト(alt)').getAttribute('aria-describedby')).toBe(
				note.id,
			);
			expect(getInput('キャプション').getAttribute('aria-describedby')).toBe(note.id);
		});

		test('キャプションか alt のどちらかを入れると、説明は消える', () => {
			render(<Harness engine={createMockEngine()} slideName={slideName} />);
			fireEvent.change(getInput('画像の代替テキスト(alt)'), { target: { value: '' } });
			expect(screen.queryByText('スライドの名前の説明')).not.toBeNull();

			fireEvent.change(getInput('キャプション'), { target: { value: '春の庭' } });
			expect(screen.queryByText('スライドの名前の説明')).toBeNull();
			expect(getInput('キャプション').getAttribute('aria-describedby')).toBeNull();

			fireEvent.change(getInput('キャプション'), { target: { value: '' } });
			fireEvent.change(getInput('画像の代替テキスト(alt)'), { target: { value: '桜' } });
			expect(screen.queryByText('スライドの名前の説明')).toBeNull();
		});

		test('リンクがあるときは alt の必須の説明を優先し、スライドの名前の説明は出さない', () => {
			render(<Harness engine={createMockEngine()} slideName={slideName} />);
			fireEvent.change(getInput('画像の代替テキスト(alt)'), { target: { value: '' } });
			fireEvent.change(getInput('リンク先URL'), {
				target: { value: 'https://example.com/' },
			});

			expect(screen.queryByText('スライドの名前の説明')).toBeNull();
			expect(screen.queryByText(/リンクやボタンの名前になるため必須/)).not.toBeNull();
		});

		test('slideName を渡さない image アイテムでは、名前の説明は出ない', () => {
			render(<Harness engine={createMockEngine()} />);
			fireEvent.change(getInput('画像の代替テキスト(alt)'), { target: { value: '' } });

			expect(screen.queryByText('スライドの名前の説明')).toBeNull();
		});
	});

	test('タブ2でも必須の説明は残り、画像1のタブで編集する旨の注記と両方がつながる', () => {
		render(<Harness engine={createMockEngine()} initialPath={['', '/img/sp.png']} />);
		fireEvent.click(screen.getByLabelText('ポップアップで画像を開く'));

		invokeCommand(screen.getByRole('tab', { name: '画像2' }));

		const altInput = getInput('画像の代替テキスト(alt)');
		const required = screen.getByText(/リンクやボタンの名前になるため必須/);
		const tabNote = screen.getByText(/画像1のタブで編集/);
		expect(altInput.getAttribute('aria-describedby')?.split(' ')).toEqual([
			required.id,
			tabNote.id,
		]);
	});
});

describe('画像ロード失敗', () => {
	afterEach(() => {
		vi.unstubAllGlobals(); // cspell:disable-line
	});

	test('読み込み失敗時はエラーが表示されサイズfieldsetが再有効化される', async () => {
		class FailingImage extends EventTarget {
			naturalHeight = 0;
			naturalWidth = 0;

			set src(_value: string) {
				queueMicrotask(() => this.dispatchEvent(new Event('error')));
			}
		}
		vi.stubGlobal('Image', FailingImage);

		render(<Harness engine={createMockEngine()} initialPath={['/img/broken.png', '']} />);

		const alert = await screen.findByRole('alert');
		expect(alert.textContent).toBe('画像を読み込めませんでした: /img/broken.png');

		const fieldset = narrowElement(
			screen.getByRole('group', { name: '画像のサイズ' }),
			HTMLFieldSetElement,
		);
		expect(fieldset.disabled).toBe(false);
	});
});

describe('engine単位で共有されるFileBrowserStoreの残留選択（regression）', () => {
	afterEach(() => {
		vi.unstubAllGlobals(); // cspell:disable-line
	});

	test('別itemの選択が残っていても、マウント直後に自分のpathを読み込む（他itemの画像へ差し替わらない）', async () => {
		/**
		 * 構築されたsrcを記録するだけで、loadは呼ばれるまで発火しない
		 * 制御可能なImageスタブ
		 */
		class ControllableImage extends EventTarget {
			naturalHeight = 100;
			naturalWidth = 100;
			#src = '';
			get src() {
				return this.#src;
			}
			set src(value: string) {
				this.#src = value;
				ControllableImage.constructedUrls.push(value);
			}
			constructor() {
				super();
				ControllableImage.instances.push(this);
			}
			static constructedUrls: string[] = [];
			static instances: ControllableImage[] = [];
		}
		vi.stubGlobal('Image', ControllableImage);

		const engine = createMockEngine();

		// item A（/img/a.png）をマウントして選択を確定させる（マウント時の
		// fileSelect(0)がengine共有のFileBrowserStore.selected.imageを
		// /img/a.pngにする）
		const { unmount } = render(
			<Harness engine={engine} initialPath={['/img/a.png', '']} />,
		);
		await vi.waitFor(() => {
			expect(ControllableImage.instances.some((i) => i.src === '/img/a.png')).toBe(true);
		});
		unmount();

		// item Aの画像読み込みが完了しないまま（未loadのまま）、
		// 別item B（/img/b.png）を同じengineでマウントする
		ControllableImage.constructedUrls = [];
		let latestB: ImageData | undefined;
		render(
			<Harness
				engine={engine}
				initialPath={['/img/b.png', '']}
				onState={(s) => (latestB = s)}
			/>,
		);

		await vi.waitFor(() => {
			expect(ControllableImage.constructedUrls).toContain('/img/b.png');
		});
		// item Aの残留選択（/img/a.png）に対する読み込みがBのマウントで
		// 誘発されていないこと
		expect(ControllableImage.constructedUrls).not.toContain('/img/a.png');

		// Bの読み込みを完了させ、最終stateがBのままであることを確認する
		const bInstance = ControllableImage.instances.find((i) => i.src === '/img/b.png');
		await act(async () => {
			bInstance?.dispatchEvent(new Event('load'));
			await Promise.resolve();
		});
		expect(latestB?.path?.[0]).toBe('/img/b.png');
	});
});

/**
 * srcを代入すると、次のマイクロタスクでloadを発火する`Image`スタブ。
 * `loadImage` は `src` の代入後にリスナーを付けるので、同期で発火すると取りこぼす
 */
class LoadingImage extends EventTarget {
	naturalHeight = 200;
	naturalWidth = 300;

	set src(_value: string) {
		queueMicrotask(() => {
			this.dispatchEvent(new Event('load'));
		});
	}
}

/**
 * 画像の読み込みが終わり、state が反映されるまで待つ
 */
async function settle() {
	await act(async () => {
		await new Promise((resolve) => setTimeout(resolve, 0));
	});
}

/**
 * 2枚の画像を持ち、メディアクエリーを指定できるハーネス。`createInitialState` の
 * 既定（画像2に入力済みのメディアクエリー）を、空にして確かめるために使う
 * @param root0
 * @param root0.mediaQueries - config の `mediaQueries`
 * @param root0.media - 初期の `media`
 * @param root0.onState
 * @param root0.engineOverrides - エンジンに重ねる値（`{ config: undefined }` で config を持たないエンジン）
 * @param root0.path - 初期の画像（既定はどちらも選択済み）
 */
function MediaHarness({
	mediaQueries,
	media,
	onState,
	engineOverrides = {},
	path = ['/img/pc.png', '/img/sp.png'],
}: {
	readonly mediaQueries?: readonly string[];
	readonly media: string[];
	readonly onState?: (state: ImageData) => void;
	readonly engineOverrides?: Record<string, unknown>;
	readonly path?: string[];
}) {
	const [engine] = useState(() =>
		createBaseMockEngine({
			serverAPI: { getFileList: () => resolvedFileList() },
			config: { ...testConfig, mediaQueries },
			...engineOverrides,
		}),
	);
	const [state, setState] = useState<ImageData>(() => ({
		...createInitialState(path),
		media,
	}));
	onState?.(state);
	return (
		<EngineProvider engine={engine}>
			<ImageEditor state={state} setState={setState} item={{} as never} />
		</EngineProvider>
	);
}

/**
 * label文字列からselect要素を型安全に取得する
 * @param label
 */
function getSelect(label: string): HTMLSelectElement {
	return narrowElement(screen.getByLabelText(label), HTMLSelectElement, label);
}

describe('画像2のメディアクエリーの既定値と選択', () => {
	// 空の media の <source> はどの画面幅でも条件に合い、<img> より先に採用される。
	// 画像2を選んだ時点で値を入れ、利用者が値を見て変えられるようにする
	beforeEach(() => {
		document.body.innerHTML = '';
		vi.stubGlobal('Image', LoadingImage);
	});

	afterEach(() => {
		vi.unstubAllGlobals(); // cspell:disable-line
	});

	test('画像の読み込み中にタブを移っても、読み込んだ値は読み込みを始めたタブの画像に入る', async () => {
		// 読み込みの完了を手で起こす Image。画像1の読み込みが終わる前に画像2のタブへ移る
		const pending: EventTarget[] = [];
		class DeferredImage extends EventTarget {
			naturalHeight = 200;
			naturalWidth = 300;

			set src(_value: string) {
				pending.push(this);
			}
		}
		vi.stubGlobal('Image', DeferredImage);
		let latest: ImageData | undefined;
		render(
			<MediaHarness
				media={['', '']}
				path={['/img/pc.png', '']}
				onState={(s) => (latest = s)}
			/>,
		);
		invokeCommand(screen.getByRole('tab', { name: '画像2' }));

		await act(async () => {
			for (const image of pending) {
				image.dispatchEvent(new Event('load'));
			}
			await new Promise((resolve) => setTimeout(resolve, 0));
		});

		expect(pending.length).toBeGreaterThan(0);
		expect(latest?.path).toStrictEqual(['/img/pc.png', '']);
		expect(latest?.media).toStrictEqual(['', '']);
		expect(latest?.width?.[0]).toBe(300);
	});

	test('画像2を読み込んだとき、メディアクエリーが空なら (max-width: 767px) が選択欄と state に入る', async () => {
		let latest: ImageData | undefined;
		render(<MediaHarness media={['', '']} onState={(s) => (latest = s)} />);
		await settle();

		invokeCommand(screen.getByRole('tab', { name: '画像2' }));
		await settle();

		expect(getSelect('メディアクエリーの候補').value).toBe('(max-width: 767px)');
		expect(getInput('メディアクエリー').disabled).toBe(true);
		expect(latest?.mediaInput).toBe('(max-width: 767px)');
		expect(latest?.media).toStrictEqual(['', '(max-width: 767px)']);
	});

	test('config の mediaQueries があれば、その先頭が入る', async () => {
		let latest: ImageData | undefined;
		render(
			<MediaHarness
				media={['', '']}
				mediaQueries={['(max-width: 599px)', '(max-width: 1023px)']}
				onState={(s) => (latest = s)}
			/>,
		);
		await settle();

		invokeCommand(screen.getByRole('tab', { name: '画像2' }));
		await settle();

		expect(getSelect('メディアクエリーの候補').value).toBe('(max-width: 599px)');
		expect(latest?.media).toStrictEqual(['', '(max-width: 599px)']);
	});

	test('候補にない入力済みのメディアクエリーは上書きせず、「その他」の入力欄に出す', async () => {
		let latest: ImageData | undefined;
		render(
			<MediaHarness
				media={['', '(min-width: 1024px)']}
				mediaQueries={['(max-width: 599px)']}
				onState={(s) => (latest = s)}
			/>,
		);
		await settle();

		invokeCommand(screen.getByRole('tab', { name: '画像2' }));
		await settle();

		expect(getSelect('メディアクエリーの候補').selectedOptions[0]?.textContent).toBe(
			'その他（直接入力）',
		);
		expect(getInput('メディアクエリー').value).toBe('(min-width: 1024px)');
		expect(latest?.media).toStrictEqual(['', '(min-width: 1024px)']);
	});

	test('画像1を読み込んだだけでは、メディアクエリーは入らず欄は無効のまま', async () => {
		let latest: ImageData | undefined;
		render(<MediaHarness media={['', '']} onState={(s) => (latest = s)} />);
		await settle();

		// 画像1のメディアクエリーは <source> に出ない。選択欄は出さず、無効な入力欄だけが残る
		expect(screen.queryByLabelText('メディアクエリーの候補')).toBeNull();
		expect(getInput('メディアクエリー').disabled).toBe(true);
		expect(getInput('メディアクエリー').value).toBe('');
		expect(latest?.media).toStrictEqual(['', '']);
	});

	test('選択肢は config の候補と「その他（直接入力）」で、候補が無ければ (max-width: 767px) だけ', async () => {
		const { unmount } = render(
			<MediaHarness
				media={['', '']}
				mediaQueries={['(max-width: 599px)', '(max-width: 1023px)']}
			/>,
		);
		await settle();
		invokeCommand(screen.getByRole('tab', { name: '画像2' }));
		await settle();
		expect(
			[...getSelect('メディアクエリーの候補').options].map((o) => o.textContent),
		).toStrictEqual(['(max-width: 599px)', '(max-width: 1023px)', 'その他（直接入力）']);
		unmount();

		render(<MediaHarness media={['', '']} />);
		await settle();
		invokeCommand(screen.getByRole('tab', { name: '画像2' }));
		await settle();
		expect(
			[...getSelect('メディアクエリーの候補').options].map((o) => o.textContent),
		).toStrictEqual(['(max-width: 767px)', 'その他（直接入力）']);
	});

	test('config を持たないエンジンでも落ちず、既定のメディアクエリーが入る', async () => {
		let latest: ImageData | undefined;
		render(
			<MediaHarness
				media={['', '']}
				engineOverrides={{ config: undefined }}
				onState={(s) => (latest = s)}
			/>,
		);
		await settle();
		invokeCommand(screen.getByRole('tab', { name: '画像2' }));
		await settle();

		expect(getSelect('メディアクエリーの候補').value).toBe('(max-width: 767px)');
		expect(latest?.media).toStrictEqual(['', '(max-width: 767px)']);
	});

	test('候補を選ぶと state に入り、「その他」を選ぶと入力欄が有効になって自由に入力できる', async () => {
		let latest: ImageData | undefined;
		render(
			<MediaHarness
				media={['', '']}
				mediaQueries={['(max-width: 599px)', '(max-width: 1023px)']}
				onState={(s) => (latest = s)}
			/>,
		);
		await settle();
		invokeCommand(screen.getByRole('tab', { name: '画像2' }));
		await settle();

		fireEvent.change(getSelect('メディアクエリーの候補'), {
			target: { value: '(max-width: 1023px)' },
		});
		expect(latest?.media).toStrictEqual(['', '(max-width: 1023px)']);
		expect(getInput('メディアクエリー').disabled).toBe(true);

		// 「その他」に切り替えると、いまの値のまま入力欄が有効になる
		fireEvent.change(getSelect('メディアクエリーの候補'), {
			target: { value: '__bge-other__' },
		});
		expect(getInput('メディアクエリー').value).toBe('(max-width: 1023px)');

		fireEvent.change(getInput('メディアクエリー'), {
			target: { value: '(min-width: 1440px)' },
		});
		expect(latest?.media).toStrictEqual(['', '(min-width: 1440px)']);
	});

	test('直接入力の値が候補と一致しても、欄を離れても「その他」のまま編集を続けられる', async () => {
		let latest: ImageData | undefined;
		render(
			<MediaHarness
				media={['', '(min-width: 1024px)']}
				mediaQueries={['(max-width: 599px)']}
				onState={(s) => (latest = s)}
			/>,
		);
		await settle();
		invokeCommand(screen.getByRole('tab', { name: '画像2' }));
		await settle();

		// 打ち込んだ値がたまたま候補と同じになっても、入力中に欄が消えてフォーカスを失わない
		fireEvent.change(getInput('メディアクエリー'), {
			target: { value: '(max-width: 599px)' },
		});
		expect(getInput('メディアクエリー').value).toBe('(max-width: 599px)');
		expect(latest?.media).toStrictEqual(['', '(max-width: 599px)']);

		// 欄を離れても「その他」のまま、続けて編集できる
		fireEvent.blur(getInput('メディアクエリー'));
		expect(getSelect('メディアクエリーの候補').value).toBe('__bge-other__');
		expect(getInput('メディアクエリー').disabled).toBe(false);
	});

	test('候補と同じ値のまま「その他」を選び、空にして欄を離れると、選択欄が既定値を示して入力欄は無効になる', async () => {
		let latest: ImageData | undefined;
		render(
			<MediaHarness
				media={['', '(max-width: 1023px)']}
				mediaQueries={['(max-width: 599px)', '(max-width: 1023px)']}
				onState={(s) => (latest = s)}
			/>,
		);
		await settle();
		invokeCommand(screen.getByRole('tab', { name: '画像2' }));
		await settle();

		fireEvent.change(getSelect('メディアクエリーの候補'), {
			target: { value: '__bge-other__' },
		});
		fireEvent.change(getInput('メディアクエリー'), { target: { value: '' } });
		fireEvent.blur(getInput('メディアクエリー'));

		expect(latest?.media).toStrictEqual(['', '(max-width: 599px)']);
		expect(getSelect('メディアクエリーの候補').value).toBe('(max-width: 599px)');
		expect(getInput('メディアクエリー').disabled).toBe(true);
	});

	test('候補と同じ値のまま「その他」を選び、編集せずに欄を離れても、値を変えずに「その他」のまま編集を続けられる', async () => {
		let latest: ImageData | undefined;
		render(
			<MediaHarness
				media={['', '(max-width: 1023px)']}
				mediaQueries={['(max-width: 599px)', '(max-width: 1023px)']}
				onState={(s) => (latest = s)}
			/>,
		);
		await settle();
		invokeCommand(screen.getByRole('tab', { name: '画像2' }));
		await settle();

		fireEvent.change(getSelect('メディアクエリーの候補'), {
			target: { value: '__bge-other__' },
		});
		fireEvent.blur(getInput('メディアクエリー'));

		expect(latest?.media).toStrictEqual(['', '(max-width: 1023px)']);
		expect(getSelect('メディアクエリーの候補').value).toBe('__bge-other__');
		expect(getInput('メディアクエリー').disabled).toBe(false);
	});

	test('前後に空白のある値で欄を離れると、空白を取り除き、「その他」のまま編集を続けられる', async () => {
		let latest: ImageData | undefined;
		render(
			<MediaHarness
				media={['', '(max-width: 1023px)']}
				mediaQueries={['(max-width: 599px)', '(max-width: 1023px)']}
				onState={(s) => (latest = s)}
			/>,
		);
		await settle();
		invokeCommand(screen.getByRole('tab', { name: '画像2' }));
		await settle();

		fireEvent.change(getSelect('メディアクエリーの候補'), {
			target: { value: '__bge-other__' },
		});
		fireEvent.change(getInput('メディアクエリー'), {
			target: { value: ' (max-width: 599px) ' },
		});
		fireEvent.blur(getInput('メディアクエリー'));

		expect(latest?.media).toStrictEqual(['', '(max-width: 599px)']);
		expect(getSelect('メディアクエリーの候補').value).toBe('__bge-other__');
		expect(getInput('メディアクエリー').value).toBe('(max-width: 599px)');
		expect(getInput('メディアクエリー').disabled).toBe(false);
	});

	test('画像2で「その他」を選んでも、タブを移ると、候補と同じ値の画像では入力欄が無効に戻る', async () => {
		render(
			<MediaHarness
				media={['', '(max-width: 767px)']}
				mediaQueries={['(max-width: 767px)']}
			/>,
		);
		await settle();
		invokeCommand(screen.getByRole('tab', { name: '画像2' }));
		await settle();
		fireEvent.change(getSelect('メディアクエリーの候補'), {
			target: { value: '__bge-other__' },
		});
		expect(getInput('メディアクエリー').value).toBe('(max-width: 767px)');

		// 画像1 → 画像2 と移ると、選んだ「その他」は引き継がれず、値から導き直される
		invokeCommand(screen.getByRole('tab', { name: '画像1' }));
		invokeCommand(screen.getByRole('tab', { name: '画像2' }));
		await settle();

		expect(getSelect('メディアクエリーの候補').value).toBe('(max-width: 767px)');
		expect(getInput('メディアクエリー').disabled).toBe(true);
	});

	test('画像2が未選択の間は、選択欄も無効になり、入力欄と同じ注記に結び付く', async () => {
		render(<MediaHarness media={['', '']} path={['', '']} />);
		await settle();

		invokeCommand(screen.getByRole('tab', { name: '画像2' }));

		const select = getSelect('メディアクエリーの候補');
		expect(select.disabled).toBe(true);
		const note = screen.getByText(/先に画像を選択/);
		expect(select.getAttribute('aria-describedby')).toBe(note.id);
		expect(getInput('メディアクエリー').getAttribute('aria-describedby')).toBe(note.id);
	});

	test('「その他」で空にしたまま欄を離れると、その場で既定値（候補の先頭）に戻る', async () => {
		let latest: ImageData | undefined;
		render(
			<MediaHarness
				media={['', '(min-width: 1024px)']}
				mediaQueries={['(max-width: 599px)', '(max-width: 1023px)']}
				onState={(s) => (latest = s)}
			/>,
		);
		await settle();
		invokeCommand(screen.getByRole('tab', { name: '画像2' }));
		await settle();

		// 入力中（消して打ち直す間）は、空のままにできる
		const input = getInput('メディアクエリー');
		fireEvent.change(input, { target: { value: '' } });
		expect(latest?.media).toStrictEqual(['', '']);
		expect(getInput('メディアクエリー').value).toBe('');

		// 空のまま欄を離れると、既定値（候補の先頭）に戻り、選択欄がそれを示す
		fireEvent.blur(getInput('メディアクエリー'));
		expect(latest?.media).toStrictEqual(['', '(max-width: 599px)']);
		expect(getSelect('メディアクエリーの候補').value).toBe('(max-width: 599px)');
		expect(getInput('メディアクエリー').disabled).toBe(true);
	});

	test('空白だけの値も、空と同じく欄を離れると既定値に戻る', async () => {
		let latest: ImageData | undefined;
		render(
			<MediaHarness media={['', '(min-width: 1024px)']} onState={(s) => (latest = s)} />,
		);
		await settle();
		invokeCommand(screen.getByRole('tab', { name: '画像2' }));
		await settle();

		fireEvent.change(getInput('メディアクエリー'), { target: { value: '  ' } });
		fireEvent.blur(getInput('メディアクエリー'));

		expect(latest?.media).toStrictEqual(['', '(max-width: 767px)']);
	});

	test('値が入っている欄を離れても、値は変わらない', async () => {
		let latest: ImageData | undefined;
		render(
			<MediaHarness media={['', '(min-width: 1024px)']} onState={(s) => (latest = s)} />,
		);
		await settle();
		invokeCommand(screen.getByRole('tab', { name: '画像2' }));
		await settle();

		fireEvent.blur(getInput('メディアクエリー'));

		expect(latest?.media).toStrictEqual(['', '(min-width: 1024px)']);
		expect(getInput('メディアクエリー').value).toBe('(min-width: 1024px)');
	});
});

describe('google-mapsのisDisableガード', () => {
	test('APIキー未設定なら利用不可メッセージを返す', async () => {
		const { default: googleMapsSeed } = await import('../google-maps/index.js');
		const item = { config: testConfig } as unknown as Item<ItemData, {}>;
		expect(googleMapsSeed.editorOptions?.isDisable?.(item as never)).toBe(
			'Google Maps APIキーが登録されていないため、利用できません。\n「システム設定」からAPIキーを登録することができます。',
		);
	});

	test('APIキーが設定されていれば空文字列を返す', async () => {
		const { default: googleMapsSeed } = await import('../google-maps/index.js');
		const item = {
			config: { ...testConfig, googleMapsApiKey: 'test-key' },
		} as unknown as Item<ItemData, {}>;
		expect(googleMapsSeed.editorOptions?.isDisable?.(item as never)).toBe('');
	});
});
