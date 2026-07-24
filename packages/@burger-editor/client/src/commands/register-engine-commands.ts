import type { BlockCatalog, BurgerEditorEngine } from '@burger-editor/core';

import { BGE_COMMAND } from '@burger-editor/core';

import { replaceElement } from '../replace-element.js';

/**
 * Register the engine's central command dispatch table.
 *
 * This is the single place where engine-mutating UI commands are
 * implemented; buttons anywhere (main document or EditableArea iframes)
 * declare them with `commandfor={COMMAND_BUS_ID}`. Call once per engine.
 * @param engine - The engine instance
 * @param catalog - The block catalog used by `--add-block`
 */
export function registerEngineCommands(
	engine: BurgerEditorEngine,
	catalog: BlockCatalog,
) {
	const bus = engine.commandBus;

	bus.define(BGE_COMMAND.moveBlock, async (e) => {
		const currentBlock = engine.getCurrentBlock();
		if (engine.isProcessed || !currentBlock) {
			return;
		}

		const toTop = (e.source as HTMLButtonElement | null)?.value === 'up';

		let fromEl: HTMLElement | null;
		let toEl: HTMLElement | null;
		if (toTop) {
			fromEl = currentBlock.el.previousElementSibling as HTMLElement;
			toEl = currentBlock.el;
		} else {
			fromEl = currentBlock.el;
			toEl = currentBlock.el.nextElementSibling as HTMLElement;
		}

		if (!fromEl || !toEl) {
			return;
		}

		engine.isProcessed = true;

		await replaceElement(fromEl, toEl);

		engine.isProcessed = false;
		engine.save();
	});

	bus.define(BGE_COMMAND.insertBlock, (e) => {
		const currentBlock = engine.getCurrentBlock();
		if (engine.isProcessed || !currentBlock) {
			return;
		}
		const toTop = (e.source as HTMLButtonElement | null)?.value === 'before';
		engine.content.insertionPoint.set(currentBlock, toTop);
		engine.uiState.openBlockCatalog();
	});

	bus.define(BGE_COMMAND.updateGridItems, (e) => {
		const currentBlock = engine.getCurrentBlock();
		if (engine.isProcessed || !currentBlock) {
			return;
		}

		const addOrRemove = (e.source as HTMLButtonElement | null)?.value === '-1' ? -1 : 1;

		if (
			addOrRemove === -1 &&
			!confirm(
				'ブロック内の最後の要素を削除します。\n削除した要素はもとに戻すことはできません。\n削除してもよろしいですか？',
			)
		) {
			return;
		}

		currentBlock.updateGridItems(addOrRemove, engine);

		engine.save();
	});

	bus.define(BGE_COMMAND.openBlockOptions, () => {
		const currentBlock = engine.getCurrentBlock();
		if (engine.isProcessed || !currentBlock) {
			return;
		}
		engine.uiState.openBlockOptions(currentBlock);
	});

	bus.define(BGE_COMMAND.copyBlock, () => {
		const currentBlock = engine.getCurrentBlock();
		if (engine.isProcessed || !currentBlock) {
			return;
		}

		const json = currentBlock.toJSONStringify();

		sessionStorage.setItem(engine.storageKey.blockClipboard, json);

		alert(
			'ブロックをコピーしました。\nブロックの追加ボタンからペースト（貼り付け）することができます。',
		);
	});

	bus.define(BGE_COMMAND.removeBlock, async () => {
		const currentBlock = engine.getCurrentBlock();
		if (engine.isProcessed || !currentBlock) {
			return;
		}

		if (
			!confirm(
				'ブロックを削除します。\n削除したブロックはもとに戻すことはできません。\n削除してもよろしいですか？',
			)
		) {
			return;
		}

		engine.isProcessed = true;

		await Promise.resolve();

		currentBlock.remove();
		engine.clearCurrentBlock();

		engine.isProcessed = false;
		engine.save();
	});

	bus.define(BGE_COMMAND.insertInitialBlock, () => {
		if (engine.isProcessed) {
			return;
		}
		engine.content.insertionPoint.set(null, false);
		engine.uiState.openBlockCatalog();
	});

	bus.define(BGE_COMMAND.addBlock, async (e) => {
		const source = e.source as HTMLButtonElement | null;
		const category = source?.dataset['category'];
		const index = Number(source?.dataset['index']);
		const definition = category ? catalog[category]?.[index]?.definition : undefined;
		if (!definition) {
			return;
		}
		engine.uiState.closeDialog();
		await engine.addBlock(definition);
	});

	bus.define(BGE_COMMAND.switchContent, (e) => {
		const target = (e.source as HTMLButtonElement | null)?.value;
		if (target === 'main') {
			engine.showMain();
		} else {
			engine.showDraft();
		}
	});

	bus.define(BGE_COMMAND.copyMainToDraft, async () => {
		if (
			await engine.mainToDraft(() =>
				confirm('本稿内容を下書きへ上書きしてもよろしいですか？'),
			)
		) {
			engine.showDraft();
		}
	});

	bus.define(BGE_COMMAND.copyDraftToMain, async () => {
		if (
			await engine.draftToMain(() =>
				confirm('下書き内容を本稿へ上書きしてもよろしいですか？'),
			)
		) {
			engine.showMain();
		}
	});

	bus.define(BGE_COMMAND.pasteBlock, async () => {
		const jsonString = sessionStorage.getItem(engine.storageKey.blockClipboard);

		if (!jsonString) {
			alert('クリップボードにブロックデータがありません。');
			return;
		}

		let blockData;
		try {
			blockData = JSON.parse(jsonString);
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error('Invalid JSON in clipboard:', error);
			alert(
				'ブロックの貼り付けに失敗しました。\n' +
					'クリップボードのデータが破損している可能性があります。\n' +
					'もう一度ブロックをコピーしてください。',
			);
			return;
		}

		engine.uiState.closeDialog();

		await engine.addBlock(blockData);

		sessionStorage.removeItem(engine.storageKey.blockClipboard);
	});
}
