import type { BurgerEditorEngine, EditableAreaHostContext } from '@burger-editor/core';

import { UIStateStore } from '@burger-editor/core';
import { act } from 'react';
import { test, expect, afterEach, vi } from 'vitest';

import { createReactView } from './create-react-view.js';

// jsdomはCSS.escape未実装（BlockMenuButtonが使う）。このテストでは
// EditableAreaView経由でBlockMenuも描画されるため必要
if (globalThis.CSS === undefined) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(globalThis as any).CSS = {
		escape: (value: string) => String(value).replaceAll(/[^\w-]/g, (ch) => `\\${ch}`),
	};
}

afterEach(() => {
	document.body.innerHTML = '';
});

/**
 * createAreaHostが要求する最小限のコンテキストを組み立てる
 */
function createContext(): EditableAreaHostContext {
	const viewArea = document.createElement('div');
	document.body.append(viewArea);
	const engine = {
		el: document.createElement('div'),
		viewArea,
		uiState: new UIStateStore(),
		commandBus: { createReceiver: vi.fn() },
		componentObserver: { notify: vi.fn() },
		getEditableContent: () => null,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} as any as BurgerEditorEngine;

	return {
		type: 'main',
		engine,
		initialContent: '',
		stylesheets: [],
		classList: [],
	};
}

test('createAreaHostはviewArea配下にマウントしcontainerElementを持つhostを解決する', async () => {
	const view = createReactView();
	const context = createContext();

	const host = await view.createAreaHost(context);

	// containerElementはEditableAreaViewがiframe文書内に生成するため、
	// viewArea自体（親文書）からは直接containsできない。iframeが
	// viewArea配下にマウントされ、その文書内にcontainerElementが
	// あることを検証する
	expect(context.engine.viewArea.children.length).toBe(1);
	const iframe = context.engine.viewArea.querySelector('iframe');
	expect(iframe?.contentDocument?.contains(host.containerElement)).toBe(true);
});

test('destroy()はReact rootのunmountに加えてマウント用の<div>自体も取り除く（regression）', async () => {
	const view = createReactView();
	const context = createContext();
	await view.createAreaHost(context);

	// createAreaHostがviewArea配下に追加したマウント用div
	const mountEl = context.engine.viewArea.firstElementChild;
	expect(mountEl).not.toBeNull();

	act(() => {
		view.destroy();
	});

	// unmountだけではmountEl自体はDOMに残る。destroy()はそれ自体も
	// 除去しなければならない — 放置するとcleanUp()を繰り返すたびに
	// 空のdivがviewArea配下に積み重なる
	expect(context.engine.viewArea.contains(mountEl)).toBe(false);
	expect(context.engine.viewArea.children.length).toBe(0);
});

test('destroy()を複数エリアぶん呼んでもすべてのマウント要素が除去される', async () => {
	const view = createReactView();
	const mainContext = createContext();
	const draftContext = {
		...createContext(),
		type: 'draft' as const,
		engine: mainContext.engine,
	};

	await view.createAreaHost(mainContext);
	await view.createAreaHost(draftContext);
	expect(mainContext.engine.viewArea.children.length).toBe(2);

	act(() => {
		view.destroy();
	});

	expect(mainContext.engine.viewArea.children.length).toBe(0);
});
