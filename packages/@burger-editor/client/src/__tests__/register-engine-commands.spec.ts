import type { BurgerEditorEngine } from '@burger-editor/core';

import { BGE_COMMAND, CommandBus, UIStateStore } from '@burger-editor/core';
import { test, expect, describe, beforeEach, vi } from 'vitest';

import { registerEngineCommands } from '../commands/register-engine-commands.js';

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

		dispatchCommand(receiver, BGE_COMMAND.switchContent, createSource('draft'));
		expect(engine.showDraft).toHaveBeenCalledTimes(1);
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

	test('block commands are guarded when no block is selected', () => {
		const engine = createMockEngine();
		registerEngineCommands(engine, {});
		const receiver = engine.commandBus.createReceiver(document.body);

		dispatchCommand(receiver, BGE_COMMAND.copyBlock);
		dispatchCommand(receiver, BGE_COMMAND.removeBlock);
		dispatchCommand(receiver, BGE_COMMAND.moveBlock, createSource('up'));

		expect(engine.save).not.toHaveBeenCalled();
	});
});
