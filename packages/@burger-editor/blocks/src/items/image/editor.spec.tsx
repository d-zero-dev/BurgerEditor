import type { ImageData } from './index.js';
import type { BurgerEditorEngine, ItemData, Item } from '@burger-editor/core';

import { ComponentObserver } from '@burger-editor/core';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useState } from 'react';
import { test, expect, describe, beforeEach } from 'vitest';

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
 * 2枚構成の初期エディタ状態。pathを空にして画像ロード（jsdomでは
 * 完了しない）を発生させず、サイズ用fieldsetが無効化されないようにする
 */
function createInitialState(): ImageData {
	return imageItemSeed.toEditorState!(
		{
			path: ['', ''],
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
 *
 */
function createMockEngine() {
	return {
		componentObserver: new ComponentObserver(),
		serverAPI: {},
	} as unknown as BurgerEditorEngine;
}

/**
 * state/setStateを実際のReact stateとして供給するテストハーネス
 * @param root0
 * @param root0.engine
 */
function Harness({ engine }: { readonly engine: BurgerEditorEngine }) {
	const [state, setState] = useState<ImageData>(createInitialState);
	return (
		<ImageEditor
			state={state}
			setState={setState}
			config={testConfig}
			engine={engine}
			item={{} as never}
		/>
	);
}

/**
 * label文字列からinput要素を型安全に取得する
 * @param label
 */
function getInput(label: string): HTMLInputElement {
	const el = screen.getByLabelText(label);
	if (!(el instanceof HTMLInputElement)) {
		throw new TypeError(`input expected: ${label}`);
	}
	return el;
}

describe('ImageEditor', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	test('タブ切替でaltEditableとメディアクエリーが選択画像の値に更新される', () => {
		render(<Harness engine={createMockEngine()} />);

		const altInput = getInput('画像の代替テキスト(alt)');
		const mediaInput = getInput('メディアクエリー');
		expect(altInput.value).toBe('Aの説明');

		invokeCommand(screen.getByRole('tab', { name: '画像2' }));

		expect(altInput.value).toBe('Bの説明');
		expect(mediaInput.value).toBe('(min-width: 768px)');
		expect(mediaInput.disabled).toBe(false);

		invokeCommand(screen.getByRole('tab', { name: '画像1' }));

		expect(altInput.value).toBe('Aの説明');
		expect(mediaInput.disabled).toBe(true);
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

	test('幅の数値変更でcssWidthが更新されupdate-css-widthが通知される', () => {
		const engine = createMockEngine();
		const cssWidths: string[] = [];
		engine.componentObserver.on('update-css-width', ({ cssWidth }) => {
			cssWidths.push(cssWidth);
		});

		render(<Harness engine={engine} />);

		const numberInput = screen.getByLabelText('幅', {
			selector: 'input[type="number"]',
		});
		fireEvent.change(numberInput, { target: { value: '250' } });

		expect(cssWidths.at(-1)).toBe('250px');
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
