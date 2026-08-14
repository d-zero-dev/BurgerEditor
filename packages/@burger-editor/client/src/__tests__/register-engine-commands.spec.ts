import type { BurgerEditorEngine } from '@burger-editor/core';

import { BGE_COMMAND, CommandBus, UIStateStore } from '@burger-editor/core';
import { test, expect, describe, beforeEach, afterEach, vi } from 'vitest';

import { registerEngineCommands } from '../commands/register-engine-commands.js';

const alertMock = vi.fn();
const confirmMock = vi.fn();
vi.stubGlobal('alert', alertMock);
vi.stubGlobal('confirm', confirmMock);

// jsdomはWeb Animations API未実装のため、replaceElementの
// アニメーションを即時完了扱いにしてDOM並べ替えだけ検証する
Element.prototype.animate = vi
	.fn()
	.mockReturnValue({ finished: Promise.resolve() }) as unknown as Element['animate'];

beforeEach(() => {
	alertMock.mockClear();
	confirmMock.mockReset();
});

afterEach(() => {
	vi.clearAllTimers();
});

/**
 * CommandEventの合成ディスパッチ
 * @param el
 * @param command
 * @param source
 */
function dispatchCommand(el: HTMLElement, command: string, source?: Element) {
	const event = new Event('command');
	Object.assign(event, { command, source: source ?? null });
	el.dispatchEvent(event);
}

/**
 * valueを持つ発火元ボタンを作る
 * @param value
 */
function createSource(value?: string) {
	const button = document.createElement('button');
	if (value !== undefined) {
		button.value = value;
	}
	return button;
}

/**
 *
 */
function createMockEngine() {
	const commandBus = new CommandBus();
	const uiState = new UIStateStore();
	const engine = {
		commandBus,
		uiState,
		isProcessed: false,
		getCurrentBlock: vi.fn().mockReturnValue(null),
		clearCurrentBlock: vi.fn(),
		showMain: vi.fn(),
		showDraft: vi.fn(),
		mainToDraft: vi.fn().mockResolvedValue(false),
		draftToMain: vi.fn().mockResolvedValue(false),
		save: vi.fn(),
		addBlock: vi.fn().mockResolvedValue(),
		storageKey: { blockClipboard: 'test-clipboard' },
		content: {
			insertionPoint: { set: vi.fn() },
		},
	} as unknown as BurgerEditorEngine;
	return engine;
}

describe('registerEngineCommands', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
		sessionStorage.clear();
	});

	test('--open-block-options snapshots the current block into the dialog state', () => {
		const engine = createMockEngine();
		const block = { name: 'target-block' };
		(engine.getCurrentBlock as ReturnType<typeof vi.fn>).mockReturnValue(block);
		registerEngineCommands(engine, {});
		const receiver = engine.commandBus.createReceiver(document.body);

		dispatchCommand(receiver, BGE_COMMAND.openBlockOptions);

		expect(engine.uiState.getSnapshot().openDialog).toEqual({
			type: 'block-options',
			block,
		});
	});

	test('--open-block-options is guarded when no block is selected', () => {
		const engine = createMockEngine();
		registerEngineCommands(engine, {});
		const receiver = engine.commandBus.createReceiver(document.body);

		dispatchCommand(receiver, BGE_COMMAND.openBlockOptions);

		expect(engine.uiState.getSnapshot().openDialog).toBeNull();
	});

	test('--switch-content routes to showMain/showDraft by value', () => {
		const engine = createMockEngine();
		registerEngineCommands(engine, {});
		const receiver = engine.commandBus.createReceiver(document.body);

		dispatchCommand(receiver, BGE_COMMAND.switchContent, createSource('main'));
		expect(engine.showMain).toHaveBeenCalledTimes(1);
		expect(engine.showDraft).not.toHaveBeenCalled();

		dispatchCommand(receiver, BGE_COMMAND.switchContent, createSource('draft'));
		expect(engine.showDraft).toHaveBeenCalledTimes(1);
		expect(engine.showMain).toHaveBeenCalledTimes(1);
	});

	test('--insert-initial-block sets the insertion point and opens the catalog', () => {
		const engine = createMockEngine();
		registerEngineCommands(engine, {});
		const receiver = engine.commandBus.createReceiver(document.body);

		dispatchCommand(receiver, BGE_COMMAND.insertInitialBlock);

		expect(engine.content.insertionPoint.set).toHaveBeenCalledWith(null, false);
		expect(engine.uiState.getSnapshot().openDialog).toEqual({
			type: 'block-catalog',
		});
	});

	test('--add-block resolves the catalog entry from data attributes', async () => {
		const engine = createMockEngine();
		const definition = {
			name: 'test-block',
			containerProps: {},
			items: [['title-h2']],
		};
		registerEngineCommands(engine, {
			見出し: [{ label: 'テスト', definition }],
		});
		const receiver = engine.commandBus.createReceiver(document.body);

		const source = createSource();
		source.dataset['category'] = '見出し';
		source.dataset['index'] = '0';
		dispatchCommand(receiver, BGE_COMMAND.addBlock, source);

		await vi.waitFor(() => {
			expect(engine.addBlock).toHaveBeenCalledWith(definition);
		});
		expect(engine.uiState.getSnapshot().openDialog).toBeNull();
	});

	test('--paste-block imports the clipboard block and clears it', async () => {
		const engine = createMockEngine();
		registerEngineCommands(engine, {});
		const receiver = engine.commandBus.createReceiver(document.body);

		const blockData = { name: 'copied', containerProps: {}, items: [] };
		sessionStorage.setItem('test-clipboard', JSON.stringify(blockData));

		dispatchCommand(receiver, BGE_COMMAND.pasteBlock);

		await vi.waitFor(() => {
			expect(engine.addBlock).toHaveBeenCalledWith(blockData);
		});
		expect(sessionStorage.getItem('test-clipboard')).toBeNull();
	});

	test('--add-block resolves nothing for unknown data attributes and keeps the dialog', () => {
		const engine = createMockEngine();
		engine.uiState.openBlockCatalog();
		registerEngineCommands(engine, {});
		const receiver = engine.commandBus.createReceiver(document.body);

		const source = createSource();
		source.dataset['category'] = '存在しないカテゴリ';
		source.dataset['index'] = '0';
		dispatchCommand(receiver, BGE_COMMAND.addBlock, source);

		expect(engine.addBlock).not.toHaveBeenCalled();
		expect(engine.uiState.getSnapshot().openDialog).toEqual({ type: 'block-catalog' });
	});

	test('--paste-block alerts and does nothing when the clipboard is empty', () => {
		const engine = createMockEngine();
		registerEngineCommands(engine, {});
		const receiver = engine.commandBus.createReceiver(document.body);

		dispatchCommand(receiver, BGE_COMMAND.pasteBlock);

		expect(alertMock).toHaveBeenCalledWith(
			'クリップボードにブロックデータがありません。',
		);
		expect(engine.addBlock).not.toHaveBeenCalled();
	});

	test('--paste-block alerts and keeps the clipboard when the JSON is corrupted', () => {
		const engine = createMockEngine();
		registerEngineCommands(engine, {});
		const receiver = engine.commandBus.createReceiver(document.body);
		sessionStorage.setItem('test-clipboard', '{broken json');
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

		dispatchCommand(receiver, BGE_COMMAND.pasteBlock);

		expect(alertMock).toHaveBeenCalledTimes(1);
		expect(engine.addBlock).not.toHaveBeenCalled();
		expect(sessionStorage.getItem('test-clipboard')).toBe('{broken json');
		consoleError.mockRestore();
	});
});

describe('block操作コマンド', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
		sessionStorage.clear();
	});

	/**
	 * 選択中ブロックを持つmockエンジンとDOM（前後に兄弟ブロックあり）を作る
	 */
	function createEngineWithBlock() {
		const engine = createMockEngine();
		const parent = document.createElement('div');
		const prevEl = document.createElement('div');
		prevEl.id = 'prev';
		const blockEl = document.createElement('div');
		blockEl.id = 'current';
		const nextEl = document.createElement('div');
		nextEl.id = 'next';
		parent.append(prevEl, blockEl, nextEl);
		document.body.append(parent);

		const block = {
			el: blockEl,
			toJSONStringify: vi.fn().mockReturnValue('{"name":"copied-block"}'),
			remove: vi.fn(),
			updateGridItems: vi.fn(),
		};
		(engine.getCurrentBlock as ReturnType<typeof vi.fn>).mockReturnValue(block);
		return { engine, block, parent, prevEl, blockEl, nextEl };
	}

	test('--move-block down swaps the block with its next sibling and saves', async () => {
		const { engine, parent } = createEngineWithBlock();
		registerEngineCommands(engine, {});
		const receiver = engine.commandBus.createReceiver(document.body);

		dispatchCommand(receiver, BGE_COMMAND.moveBlock, createSource('down'));

		await vi.waitFor(() => {
			expect(engine.save).toHaveBeenCalledTimes(1);
		});
		expect([...parent.children].map((el) => el.id)).toEqual(['prev', 'next', 'current']);
		expect(engine.isProcessed).toBe(false);
	});

	test('--move-block up swaps the block with its previous sibling and saves', async () => {
		const { engine, parent } = createEngineWithBlock();
		registerEngineCommands(engine, {});
		const receiver = engine.commandBus.createReceiver(document.body);

		dispatchCommand(receiver, BGE_COMMAND.moveBlock, createSource('up'));

		await vi.waitFor(() => {
			expect(engine.save).toHaveBeenCalledTimes(1);
		});
		expect([...parent.children].map((el) => el.id)).toEqual(['current', 'prev', 'next']);
	});

	test('--move-block resets isProcessed even when replaceElement rejects (leak regression)', async () => {
		const { engine, nextEl } = createEngineWithBlock();
		// fromEl/toElの親を分離させ、replaceElementの検証エラーで
		// 確実にrejectさせる
		const otherParent = document.createElement('div');
		otherParent.append(nextEl);
		registerEngineCommands(engine, {});
		const receiver = engine.commandBus.createReceiver(document.body);

		const onUnhandledRejection = (e: PromiseRejectionEvent) => {
			e.preventDefault();
		};
		window.addEventListener('unhandledrejection', onUnhandledRejection);

		dispatchCommand(receiver, BGE_COMMAND.moveBlock, createSource('down'));

		await vi.waitFor(() => {
			expect(engine.isProcessed).toBe(false);
		});
		expect(engine.save).not.toHaveBeenCalled();

		window.removeEventListener('unhandledrejection', onUnhandledRejection);
	});

	test('--move-block up does nothing for the first block', async () => {
		const { engine, parent, prevEl } = createEngineWithBlock();
		prevEl.remove();
		(engine.getCurrentBlock as ReturnType<typeof vi.fn>).mockReturnValue({
			el: parent.children[0],
		});
		registerEngineCommands(engine, {});
		const receiver = engine.commandBus.createReceiver(document.body);

		dispatchCommand(receiver, BGE_COMMAND.moveBlock, createSource('up'));

		await Promise.resolve();
		expect(engine.save).not.toHaveBeenCalled();
		expect([...parent.children].map((el) => el.id)).toEqual(['current', 'next']);
	});

	test('--insert-block before sets the insertion point above and opens the catalog', () => {
		const { engine, block } = createEngineWithBlock();
		registerEngineCommands(engine, {});
		const receiver = engine.commandBus.createReceiver(document.body);

		dispatchCommand(receiver, BGE_COMMAND.insertBlock, createSource('before'));

		expect(engine.content.insertionPoint.set).toHaveBeenCalledWith(block, true);
		expect(engine.uiState.getSnapshot().openDialog).toEqual({ type: 'block-catalog' });
	});

	test('--insert-block after sets the insertion point below', () => {
		const { engine, block } = createEngineWithBlock();
		registerEngineCommands(engine, {});
		const receiver = engine.commandBus.createReceiver(document.body);

		dispatchCommand(receiver, BGE_COMMAND.insertBlock, createSource('after'));

		expect(engine.content.insertionPoint.set).toHaveBeenCalledWith(block, false);
	});

	test('--update-grid-items +1 updates without confirmation and saves', () => {
		const { engine, block } = createEngineWithBlock();
		registerEngineCommands(engine, {});
		const receiver = engine.commandBus.createReceiver(document.body);

		dispatchCommand(receiver, BGE_COMMAND.updateGridItems, createSource('1'));

		expect(confirmMock).not.toHaveBeenCalled();
		expect(block.updateGridItems).toHaveBeenCalledWith(1, engine);
		expect(engine.save).toHaveBeenCalledTimes(1);
	});

	test('--update-grid-items -1 asks for confirmation and aborts on cancel', () => {
		const { engine, block } = createEngineWithBlock();
		confirmMock.mockReturnValue(false);
		registerEngineCommands(engine, {});
		const receiver = engine.commandBus.createReceiver(document.body);

		dispatchCommand(receiver, BGE_COMMAND.updateGridItems, createSource('-1'));

		expect(confirmMock).toHaveBeenCalledTimes(1);
		expect(block.updateGridItems).not.toHaveBeenCalled();
		expect(engine.save).not.toHaveBeenCalled();
	});

	test('--update-grid-items -1 removes the last item when confirmed', () => {
		const { engine, block } = createEngineWithBlock();
		confirmMock.mockReturnValue(true);
		registerEngineCommands(engine, {});
		const receiver = engine.commandBus.createReceiver(document.body);

		dispatchCommand(receiver, BGE_COMMAND.updateGridItems, createSource('-1'));

		expect(block.updateGridItems).toHaveBeenCalledWith(-1, engine);
		expect(engine.save).toHaveBeenCalledTimes(1);
	});

	test('--copy-block stores the block JSON in sessionStorage and notifies', () => {
		const { engine } = createEngineWithBlock();
		registerEngineCommands(engine, {});
		const receiver = engine.commandBus.createReceiver(document.body);

		dispatchCommand(receiver, BGE_COMMAND.copyBlock);

		expect(sessionStorage.getItem('test-clipboard')).toBe('{"name":"copied-block"}');
		expect(alertMock).toHaveBeenCalledTimes(1);
	});

	test('--remove-block removes the block and saves when confirmed', async () => {
		const { engine, block } = createEngineWithBlock();
		confirmMock.mockReturnValue(true);
		registerEngineCommands(engine, {});
		const receiver = engine.commandBus.createReceiver(document.body);

		dispatchCommand(receiver, BGE_COMMAND.removeBlock);

		await vi.waitFor(() => {
			expect(engine.save).toHaveBeenCalledTimes(1);
		});
		expect(block.remove).toHaveBeenCalledTimes(1);
		expect(engine.clearCurrentBlock).toHaveBeenCalledTimes(1);
		expect(engine.isProcessed).toBe(false);
	});

	test('--remove-block aborts on cancel', async () => {
		const { engine, block } = createEngineWithBlock();
		confirmMock.mockReturnValue(false);
		registerEngineCommands(engine, {});
		const receiver = engine.commandBus.createReceiver(document.body);

		dispatchCommand(receiver, BGE_COMMAND.removeBlock);

		await Promise.resolve();
		expect(block.remove).not.toHaveBeenCalled();
		expect(engine.save).not.toHaveBeenCalled();
	});

	test('--copy-block is a no-op without a selected block', () => {
		const engine = createMockEngine();
		registerEngineCommands(engine, {});
		const receiver = engine.commandBus.createReceiver(document.body);

		dispatchCommand(receiver, BGE_COMMAND.copyBlock);

		expect(sessionStorage.getItem('test-clipboard')).toBeNull();
		expect(alertMock).not.toHaveBeenCalled();
	});

	test('--remove-block is a no-op without a selected block', () => {
		const engine = createMockEngine();
		registerEngineCommands(engine, {});
		const receiver = engine.commandBus.createReceiver(document.body);

		dispatchCommand(receiver, BGE_COMMAND.removeBlock);

		expect(confirmMock).not.toHaveBeenCalled();
	});

	test('--move-block is a no-op without a selected block', () => {
		const engine = createMockEngine();
		registerEngineCommands(engine, {});
		const receiver = engine.commandBus.createReceiver(document.body);

		dispatchCommand(receiver, BGE_COMMAND.moveBlock, createSource('up'));

		expect(engine.save).not.toHaveBeenCalled();
	});
});

describe('draft⇄mainコピーコマンド', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	test('--copy-main-to-draft switches to the draft view on success', async () => {
		const engine = createMockEngine();
		(engine.mainToDraft as ReturnType<typeof vi.fn>).mockResolvedValue(true);
		registerEngineCommands(engine, {});
		const receiver = engine.commandBus.createReceiver(document.body);

		dispatchCommand(receiver, BGE_COMMAND.copyMainToDraft);

		await vi.waitFor(() => {
			expect(engine.showDraft).toHaveBeenCalledTimes(1);
		});
	});

	test('--copy-main-to-draft stays put when the copy is refused', async () => {
		const engine = createMockEngine();
		(engine.mainToDraft as ReturnType<typeof vi.fn>).mockResolvedValue(false);
		registerEngineCommands(engine, {});
		const receiver = engine.commandBus.createReceiver(document.body);

		dispatchCommand(receiver, BGE_COMMAND.copyMainToDraft);

		await Promise.resolve();
		expect(engine.showDraft).not.toHaveBeenCalled();
	});

	test('--copy-draft-to-main passes a confirm callback backed by window.confirm', async () => {
		const engine = createMockEngine();
		(engine.draftToMain as ReturnType<typeof vi.fn>).mockResolvedValue(true);
		registerEngineCommands(engine, {});
		const receiver = engine.commandBus.createReceiver(document.body);

		dispatchCommand(receiver, BGE_COMMAND.copyDraftToMain);

		await vi.waitFor(() => {
			expect(engine.showMain).toHaveBeenCalledTimes(1);
		});

		const confirmCallback = (engine.draftToMain as ReturnType<typeof vi.fn>).mock
			.calls[0]?.[0] as () => boolean;
		confirmMock.mockReturnValue(true);
		expect(confirmCallback()).toBe(true);
		expect(confirmMock).toHaveBeenCalledWith(
			'下書き内容を本稿へ上書きしてもよろしいですか？',
		);
	});
});
