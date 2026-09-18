import type { ImageData } from './index.js';
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
 */
function Harness({
	engine,
	initialPath,
	onState,
}: {
	readonly engine: BurgerEditorEngine;
	readonly initialPath?: string[];
	readonly onState?: (state: ImageData) => void;
}) {
	const [state, setState] = useState<ImageData>(() => createInitialState(initialPath));
	onState?.(state);
	return (
		<EngineProvider engine={engine}>
			<ImageEditor state={state} setState={setState} item={{} as never} />
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
