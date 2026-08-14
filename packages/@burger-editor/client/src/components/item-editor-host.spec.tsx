import type { BurgerEditorEngine, ItemEditorProps, ItemSeed } from '@burger-editor/core';

import { Item, UIStateStore } from '@burger-editor/core';
import { render, cleanup } from '@testing-library/react';
import { createElement } from 'react';
import { test, expect, describe, beforeAll, afterEach, vi } from 'vitest';

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
 * 実際のtiptapベースのbge-wysiwyg-editorを使わず、setStyle呼び出しだけを
 * 観測できる最小限のカスタム要素スタブ
 */
class StubWysiwygEditorElement extends HTMLElement {
	setStyle = vi.fn();
}

beforeAll(() => {
	if (!customElements.get('bge-wysiwyg-editor')) {
		customElements.define('bge-wysiwyg-editor', StubWysiwygEditorElement);
	}
	HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
		this.open = true;
	};
	HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
		this.open = false;
		this.dispatchEvent(new Event('close'));
	};
});

/**
 * `<bge-wysiwyg-editor>`スタブをラップ要素内にレンダーするだけのEditor
 * @param _props
 */
function StubEditor(_props: ItemEditorProps) {
	return createElement('bge-wysiwyg-editor');
}

const wysiwygStubSeed: ItemSeed<string, {}, {}, {}> = {
	version: '1',
	name: 'wysiwyg-stub',
	template: '<div></div>',
	style: '',
	Editor: StubEditor,
};

const itemSeeds = new Map<string, ItemSeed>([['wysiwyg-stub', wysiwygStubSeed as never]]);

/**
 *
 */
function createHarness() {
	const uiState = new UIStateStore();
	const getContentStylesheet = vi.fn<() => Promise<string>>();
	let resolveStylesheet!: (css: string) => void;
	getContentStylesheet.mockImplementation(
		() =>
			new Promise((resolve) => {
				resolveStylesheet = resolve;
			}),
	);
	const engine = {
		uiState,
		save: vi.fn(),
		config: testConfig,
		getContentStylesheet,
	} as unknown as BurgerEditorEngine;

	const item = Item.create<{}, {}>('wysiwyg-stub', itemSeeds, testConfig, {});
	uiState.openItemEditor(item as never);

	return { engine, item, getResolver: () => resolveStylesheet };
}

describe('ItemEditorHost — wysiwygコンテンツスタイルシート注入', () => {
	test('getContentStylesheetの解決前にunmountされてもsetStyleは呼ばれない（未処理rejection防止）', async () => {
		const { engine, item, getResolver } = createHarness();

		const { unmount } = render(<ItemEditorHost engine={engine} item={item as never} />);
		const stub = document.querySelector('bge-wysiwyg-editor') as StubWysiwygEditorElement;
		expect(stub).not.toBeNull();

		unmount();
		getResolver()('body{color:red}');
		await Promise.resolve();
		await Promise.resolve();

		expect(stub.setStyle).not.toHaveBeenCalled();
	});

	test('getContentStylesheetが解決してもunmountされていなければsetStyleが呼ばれる', async () => {
		const { engine, item, getResolver } = createHarness();

		render(<ItemEditorHost engine={engine} item={item as never} />);
		const stub = document.querySelector('bge-wysiwyg-editor') as StubWysiwygEditorElement;

		getResolver()('body{color:red}');
		await Promise.resolve();
		await Promise.resolve();

		expect(stub.setStyle).toHaveBeenCalledWith('body{color:red}');
	});
});
