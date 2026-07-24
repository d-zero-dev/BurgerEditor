import type { BurgerEditorEngine, ItemData, ItemSeed } from '@burger-editor/core';

import { ItemEditorHost } from '@burger-editor/client/ui';
import { Item, UIStateStore } from '@burger-editor/core';
import { narrowElement } from '@burger-editor/utils';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { test, expect, describe, beforeAll, afterEach, vi } from 'vitest';

import titleH2Seed from '../title-h2/index.js';

afterEach(cleanup);

const testConfig = {
	classList: [],
	googleMapsApiKey: null,
	sampleImagePath: '/img/sample.png',
	sampleFilePath: '/pdf/sample.pdf',
	stylesheets: [],
} as const;

const itemSeeds = new Map<string, ItemSeed>([['title-h2', titleH2Seed as never]]);

// jsdomは<dialog>のshowModal/closeを実装していないため最小限を補う
beforeAll(() => {
	HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
		this.open = true;
	};
	HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
		this.open = false;
		this.dispatchEvent(new Event('close'));
	};
});

/**
 *
 */
function createHarness() {
	const uiState = new UIStateStore();
	const engine = {
		uiState,
		save: vi.fn(),
		config: testConfig,
		getContentStylesheet: vi.fn().mockResolvedValue(''),
	} as unknown as BurgerEditorEngine;

	const item = Item.create<{ titleH2: string } & ItemData, {}>(
		'title-h2',
		itemSeeds,
		testConfig,
		{ titleH2: '旧見出し' },
	);
	uiState.openItemEditor(item as never);

	return { engine, item, uiState };
}

describe('itemエディタのパイプライン統合（開く→編集→保存）', () => {
	test('itemのデータがEditorに表示され、決定でtoItemData経由でitemに書き戻される', async () => {
		const { engine, item, uiState } = createHarness();

		render(<ItemEditorHost engine={engine} item={item as never} />);

		// item.export() の内容がエディタの初期値になる
		const input = narrowElement(
			screen.getByPlaceholderText('見出しを入力してください'),
			HTMLInputElement,
		);
		expect(input.value).toBe('旧見出し');

		fireEvent.change(input, { target: { value: '新見出し' } });

		const form = narrowElement(
			document.querySelector('#item-editor-dialog-form') ?? document.body,
			HTMLFormElement,
		);
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
		const { engine, item } = createHarness();

		render(<ItemEditorHost engine={engine} item={item as never} />);

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
});
