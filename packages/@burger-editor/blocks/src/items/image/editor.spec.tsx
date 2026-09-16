import type { ImageData } from './index.js';
import type {
	BurgerEditorEngine,
	FileListResult,
	ItemData,
	Item,
} from '@burger-editor/core';

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
 * 2枚構成の初期エディタ状態。デフォルトはpathを空にして画像ロード
 * （jsdomでは完了しない）を発生させず、サイズ用fieldsetが無効化され
 * ないようにする
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
 * jsdomはInvoker Commands API未実装のため、commandfor先へ合成command
 * イベントを送ってボタン起動を再現する
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
 * jsdomはSuspenseの再開（pending→fulfilled）を安定して拾えないため、
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
	return {
		serverAPI: { getFileList: () => resolvedFileList() },
	} as unknown as BurgerEditorEngine;
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

// vitestはglobals無効のためtesting-libraryの自動cleanupが効かない。
// レンダー結果がテスト間でリークしないよう明示的に登録する
afterEach(cleanup);

describe('ImageEditor', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	test('タブ切替でaltEditableとメディアクエリーが選択画像の値に更新される', () => {
		render(<Harness engine={createMockEngine()} />);

		const altInput = getInput('画像の代替テキスト(alt)');
		const mediaInput = getInput('メディアクエリー');
		expect(altInput.value).toBe('Aの説明');
		expect(screen.getByRole('tabpanel', { name: '画像1' })).toBeTruthy();

		invokeCommand(screen.getByRole('tab', { name: '画像2' }));

		expect(altInput.value).toBe('Bの説明');
		expect(mediaInput.value).toBe('(min-width: 768px)');
		expect(mediaInput.disabled).toBe(false);
		expect(screen.getByRole('tabpanel', { name: '画像2' })).toBeTruthy();

		invokeCommand(screen.getByRole('tab', { name: '画像1' }));

		expect(altInput.value).toBe('Aの説明');
		expect(mediaInput.disabled).toBe(true);
		expect(screen.getByRole('tabpanel', { name: '画像1' })).toBeTruthy();
	});

	test('タブ2でaltを編集してもタブ1のaltは破壊されない', () => {
		render(<Harness engine={createMockEngine()} />);

		invokeCommand(screen.getByRole('tab', { name: '画像2' }));

		const altInput = getInput('画像の代替テキスト(alt)');
		fireEvent.change(altInput, { target: { value: '新しいBの説明' } });

		invokeCommand(screen.getByRole('tab', { name: '画像1' }));
		expect(altInput.value).toBe('Aの説明');

		invokeCommand(screen.getByRole('tab', { name: '画像2' }));
		expect(altInput.value).toBe('新しいBの説明');
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
