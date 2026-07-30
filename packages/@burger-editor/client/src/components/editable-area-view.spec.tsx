import type {
	BurgerEditorEngine,
	EditableAreaHost,
	EditableAreaType,
} from '@burger-editor/core';

import { UIStateStore } from '@burger-editor/core';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { act } from 'react';
import { test, expect, afterEach, beforeEach, vi } from 'vitest';

import { EditableAreaView } from './editable-area-view.js';

// jsdom doesn't implement the CSSOM `CSS` global (no CSS.escape), which
// BlockMenuButton uses to build an anchor name. Minimal polyfill scoped to
// this test file only; it isn't exercised in production (real browsers).
if (globalThis.CSS === undefined) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(globalThis as any).CSS = {
		escape: (value: string) => String(value).replaceAll(/[^\w-]/g, (ch) => `\\${ch}`),
	};
}

// jsdomはResizeObserver未実装。observe/disconnectの配線を検証するため
// 最小のスタブを差し込む
class ResizeObserverStub {
	disconnect = vi.fn();
	observe = vi.fn();
	unobserve = vi.fn();
	constructor() {
		ResizeObserverStub.instances.push(this);
	}
	static instances: ResizeObserverStub[] = [];
}

beforeEach(() => {
	ResizeObserverStub.instances = [];
	vi.stubGlobal('ResizeObserver', ResizeObserverStub);
});

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals(); // cspell:disable-line
});

/**
 * EditableAreaViewの描画に必要な最小のengineモック。uiStateは実物を使う
 * @param contents - getEditableContentが返すコンテンツモック
 * @param contents.getContentsAsString
 * @param contents.save
 */
function createMockEngine(contents?: {
	getContentsAsString?: () => string;
	save?: (content?: string) => void;
}) {
	const el = document.createElement('div');
	const uiState = new UIStateStore();
	const content = {
		getContentsAsString: contents?.getContentsAsString ?? (() => ''),
		save: contents?.save ?? vi.fn(),
	};
	return {
		el,
		uiState,
		get isProcessed() {
			return uiState.getSnapshot().processing;
		},
		clearCurrentBlock: vi.fn(),
		componentObserver: { notify: vi.fn() },
		commandBus: { createReceiver: vi.fn() },
		getEditableContent: () => content,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} as any as BurgerEditorEngine;
}

/**
 * EditableAreaViewをレンダリングしてhostの解決を待つ
 * @param engine - engineモック
 * @param type - エリア種別
 * @param initialContent - 初期コンテンツ
 */
function renderView(
	engine: BurgerEditorEngine,
	type: EditableAreaType = 'main',
	initialContent = '',
) {
	let host: EditableAreaHost | null = null;
	const utils = render(
		<EditableAreaView
			engine={engine}
			type={type}
			initialContent={initialContent}
			stylesheets={[]}
			classList={['bge-contents']}
			onReady={(h) => {
				host = h;
			}}
		/>,
	);
	// onReadyはiframeのrefコールバック（commit時）に同期で呼ばれる
	expect(host).not.toBeNull();
	return { ...utils, host: host as unknown as EditableAreaHost };
}

test('iframe文書内にコンテンツコンテナを構築してhostを解決する', () => {
	const engine = createMockEngine();
	const { host, container } = renderView(engine, 'main', '<p>hello</p>');

	expect(host.containerElement.id).toBe('bge-editable-area');
	expect(host.containerElement.dataset.bgeComponent).toBe('editable-area');
	expect(host.containerElement.classList.contains('bge-contents')).toBe(true);
	expect(typeof host.animateInsertion).toBe('function');

	const iframe = container.querySelector('iframe');
	expect(iframe?.contentDocument?.body.contains(host.containerElement)).toBe(true);
	expect(engine.commandBus.createReceiver).toHaveBeenCalledWith(
		iframe?.contentDocument?.body,
	);
});

test('再レンダリングしてもiframe要素の同一性が保たれる', () => {
	const engine = createMockEngine();
	const { container } = renderView(engine);
	const iframeBefore = container.querySelector('iframe');

	// uiState経由の状態変化で再レンダリングを起こす
	act(() => {
		engine.uiState.setProcessing(true);
	});
	act(() => {
		engine.uiState.setProcessing(false);
	});

	const iframeAfter = container.querySelector('iframe');
	expect(iframeAfter).toBe(iframeBefore);
});

test('ソースモード切替でtextareaとiframeの表示が反転しモード属性が変わる', () => {
	const engine = createMockEngine({ getContentsAsString: () => '<p>current</p>' });
	const { container } = renderView(engine, 'main');

	const wrapper = container.firstElementChild as HTMLElement;
	const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
	const iframe = container.querySelector('iframe') as HTMLIFrameElement;

	expect(wrapper.dataset.bgeComponentMode).toBe('visual');
	expect(textarea.hidden).toBe(true);
	expect(textarea.disabled).toBe(true);
	expect(iframe.hidden).toBe(false);

	act(() => {
		engine.uiState.setSourceMode('main', true);
	});

	expect(wrapper.dataset.bgeComponentMode).toBe('source');
	expect(textarea.hidden).toBe(false);
	expect(textarea.disabled).toBe(false);
	expect(iframe.hidden).toBe(true);
	// ソースモード突入時にコンテンツから最新HTMLを引き直す
	expect(textarea.value).toBe('<p>current</p>');
});

test('textareaのblurで編集内容がコンテンツにコミットされる', () => {
	const save = vi.fn();
	const engine = createMockEngine({
		getContentsAsString: () => '<p>saved</p>',
		save,
	});
	const { container } = renderView(engine, 'main');

	act(() => {
		engine.uiState.setSourceMode('main', true);
	});

	const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
	fireEvent.change(textarea, { target: { value: '<p>edited</p>' } });
	fireEvent.blur(textarea);

	expect(save).toHaveBeenCalledWith('<p>edited</p>');
	// コミット後はコンテンツ側で正規化された文字列に揃える
	expect(textarea.value).toBe('<p>saved</p>');
});

test('bge:switch-contentで自エリアの表示・非表示が切り替わる', () => {
	const engine = createMockEngine();
	const { container } = renderView(engine, 'draft');

	const wrapper = container.firstElementChild as HTMLElement;
	// draftエリアは初期状態（main表示）では隠れている
	expect(wrapper.hidden).toBe(true);

	act(() => {
		engine.el.dispatchEvent(
			new CustomEvent('bge:switch-content', { detail: { content: 'draft' } }),
		);
	});
	expect(wrapper.hidden).toBe(false);

	act(() => {
		engine.el.dispatchEvent(
			new CustomEvent('bge:switch-content', { detail: { content: 'main' } }),
		);
	});
	expect(wrapper.hidden).toBe(true);
});

test('初期挿入ボタンは空のときだけ表示されbge:savedで追従する', () => {
	const engine = createMockEngine();
	const { container } = renderView(engine, 'main', '');

	const iframe = container.querySelector('iframe') as HTMLIFrameElement;
	const button = iframe.contentDocument?.querySelector(
		'[data-bge-component="initial-insertion"]',
	) as HTMLElement;
	expect(button.hidden).toBe(false);

	act(() => {
		engine.el.dispatchEvent(
			new CustomEvent('bge:saved', { detail: { main: '<p>filled</p>' } }),
		);
	});
	expect(button.hidden).toBe(true);

	act(() => {
		engine.el.dispatchEvent(new CustomEvent('bge:saved', { detail: { main: '' } }));
	});
	expect(button.hidden).toBe(false);

	// 処理中は空でも表示しない
	act(() => {
		engine.uiState.setProcessing(true);
	});
	expect(button.hidden).toBe(true);
});

test('アンマウントでResizeObserverが解除される', () => {
	const engine = createMockEngine();
	const { unmount } = renderView(engine);

	expect(ResizeObserverStub.instances.length).toBe(1);
	const observer = ResizeObserverStub.instances[0];
	expect(observer.observe).toHaveBeenCalled();

	unmount();

	expect(observer.disconnect).toHaveBeenCalled();
});
