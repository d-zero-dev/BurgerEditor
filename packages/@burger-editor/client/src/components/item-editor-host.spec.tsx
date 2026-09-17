import type { ItemEditorProps, ItemSeed } from '@burger-editor/core';

import { Item, UIStateStore } from '@burger-editor/core';
import { narrowElement } from '@burger-editor/utils';
import { screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { test, expect, describe, afterEach, vi } from 'vitest';

import { createMockEngine as createBaseMockEngine } from '../testing/create-mock-engine.js';
import { renderWithEngine } from '../testing/render-with-engine.js';

import { ItemEditorHost } from './item-editor-host.js';

afterEach(cleanup);

const testConfig = {
	classList: [],
	googleMapsApiKey: null,
	sampleImagePath: '/img/sample.png',
	sampleFilePath: '/pdf/sample.pdf',
	stylesheets: [],
} as const;

/**
 * `data-testid`付きのテキスト入力1つだけを描画する、最小限のEditorスタブ
 * @param root0
 * @param root0.state
 * @param root0.setState
 */
function StubEditor({ state, setState }: ItemEditorProps<{ text: string }>) {
	return createElement('input', {
		'data-testid': 'stub-input',
		value: state.text ?? '',
		onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
			setState({ ...state, text: e.currentTarget.value }),
	});
}

const stubSeed: ItemSeed<string, { text: string }, {}, { text: string }> = {
	version: '1',
	name: 'stub-item',
	template: '<div></div>',
	style: '',
	Editor: StubEditor,
};

const noEditorSeed: ItemSeed<string, { text: string }, {}> = {
	version: '1',
	name: 'no-editor-item',
	template: '<div></div>',
	style: '',
};

const throwingSeed: ItemSeed<string, { text: string }, {}, { text: string }> = {
	version: '1',
	name: 'throwing-item',
	template: '<div></div>',
	style: '',
	Editor: StubEditor,
	toItemData: () => {
		throw new Error('conversion failed');
	},
};

const itemSeeds = new Map<string, ItemSeed>([
	['stub-item', stubSeed as never],
	['no-editor-item', noEditorSeed as never],
	['throwing-item', throwingSeed as never],
]);

/**
 * @param name - itemSeedsに登録済みのitem名
 */
function createHarness(name: string) {
	const uiState = new UIStateStore();
	const engine = createBaseMockEngine({ uiState, save: vi.fn(), config: testConfig });
	const item = Item.create<{ text: string }, {}>(name, itemSeeds, testConfig, {
		text: '初期値',
	});
	uiState.openItemEditor(item as never);
	return { engine, item, uiState };
}

describe('ItemEditorHost — containerTypeのdata-bge-container配線', () => {
	test('containerTypeをdata-bge-container属性としてEditorのラッパーへ渡す', () => {
		const { engine, item } = createHarness('stub-item');

		renderWithEngine(
			engine,
			<ItemEditorHost item={item as never} containerType="main" />,
		);

		const container = document.querySelector('[data-bge-container="main"]');
		expect(container).not.toBeNull();
		expect(container?.querySelector('[data-testid="stub-input"]')).not.toBeNull();
	});
});

describe('ItemEditorHost — Editor未定義のフォールバック', () => {
	test('Editorを持たないitemは名前付きのフォールバックメッセージを表示する', () => {
		const { engine, item } = createHarness('no-editor-item');

		renderWithEngine(engine, <ItemEditorHost item={item as never} />);

		expect(screen.getByText(/編集できないコンテンツです.*no-editor-item/)).toBeTruthy();
	});
});

describe('ItemEditorHost — submit失敗時はダイアログを閉じない', () => {
	test('toItemDataが投げるとcloseAndSaveは呼ばれず、role="alert"でエラーが表示される', async () => {
		const { engine, item } = createHarness('throwing-item');

		renderWithEngine(engine, <ItemEditorHost item={item as never} />);

		const input = narrowElement(screen.getByTestId('stub-input'), HTMLInputElement);
		const form = narrowElement(input.form ?? document.body, HTMLFormElement);
		fireEvent.submit(form);

		await waitFor(() => {
			expect(screen.getByRole('alert')).toBeTruthy();
		});
		// action内のclosedAndSave()（closeDialog + save）は、submitRef.current()の
		// throwが伝播した時点で以降が実行されないため呼ばれない
		expect(engine.save).not.toHaveBeenCalled();
	});
});
