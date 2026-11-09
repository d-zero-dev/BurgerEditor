import type { ItemOverlayAnchor, BlockMenuMargin } from './block-menu-view.js';
import type { ItemData } from '@burger-editor/core';
import type { RefObject } from 'react';

import { Item, getBlockAtPosition } from '@burger-editor/core';
import { useId, useEffect, useRef, useState, useCallback } from 'react';

import { useEngine } from '../engine-context.js';
import { useCommand } from '../use-command.js';
import { useUIState } from '../use-engine.js';

import { applyBlockMenuAnchors, clearBlockMenuAnchors } from './block-menu-anchors.js';
import { BlockMenuView } from './block-menu-view.js';

/**
 * Hover menu over the selected block inside the editable area iframe.
 * Block operations are declared as engine commands; positioning and
 * visibility are React state owned entirely by this component — the
 * single source of truth. While `engine.uiState.processing` is true the
 * menu hides itself by subscribing to the store; nothing outside React
 * ever writes this component's `hidden` attribute (a direct DOM write
 * would leave React's `visible` state out of sync and a later same-value
 * `setVisible(true)` would be skipped, leaving the menu stuck hidden).
 *
 * マウス追跡・`BurgerBlock` 解決・`engine` 接続を担うコンテナで、
 * 実際の描画は {@link BlockMenuView} に委譲する。`BlockMenuView` は
 * `BurgerBlock` の実インスタンスなしに見た目だけ確認できるため、
 * Storybook 等では `BlockMenuView` を直接使う。
 * @param root0
 * @param root0.container
 * @example
 * ```tsx
 * <BlockMenu container={frameBody} />
 * ```
 */
export function BlockMenu({ container }: { readonly container: HTMLElement }) {
	const engine = useEngine();
	const menuId = useId();
	const currentBlock = useUIState((s) => s.currentBlock);
	const [visible, setVisible] = useState(false);
	const [itemAnchors, setItemAnchors] = useState<readonly ItemOverlayAnchor[]>([]);
	const itemsRef: RefObject<readonly Item<ItemData, {}>[]> = useRef([]);
	const anchoredBlockElRef = useRef<HTMLElement | null>(null);
	const [margin, setMargin] = useState<BlockMenuMargin>({
		marginBlockEnd: 0,
		marginBlockEndValue: '0px',
	});

	const rootRef = useCommand<HTMLDivElement>({
		'--open-item-editor': (e) => {
			if (engine.isProcessed) {
				return;
			}
			const index = Number((e.source as HTMLButtonElement | null)?.value);
			const item = itemsRef.current[index];
			if (!item) {
				// オーバーレイはItem解決済みの要素にのみ描画されるため、
				// ここに到達するのはindexとオーバーレイの不整合バグ
				throw new Error(`item overlay index ${index} does not resolve to an Item`);
			}
			engine.uiState.openItemEditor(item);
		},
	});

	const clearAnchoredBlock = useCallback(() => {
		const el = anchoredBlockElRef.current;
		if (el) {
			clearBlockMenuAnchors(el);
			anchoredBlockElRef.current = null;
		}
	}, []);

	const hide = useCallback(() => {
		setVisible(false);
		clearAnchoredBlock();
		setItemAnchors([]);
		itemsRef.current = [];
		// engine.uiState.currentBlock もここでnullになる — clearCurrentBlock()
		// が内部でuiState.setCurrentBlock(null)を呼ぶため、ローカルstateの
		// 二重管理は不要（store一本が真実の源）
		engine.clearCurrentBlock();
	}, [engine, clearAnchoredBlock]);

	// エンジン処理中（ブロック移動・挿入など）はメニューを自律的に隠す。
	// uiStateストアを購読し、processingへの遷移でReact自身のstateを畳む
	// （外部からこのコンポーネントのDOMを書き込む経路は存在しない）
	useEffect(() => {
		return engine.uiState.subscribe(() => {
			if (engine.uiState.getSnapshot().processing) {
				hide();
			}
		});
	}, [engine, hide]);

	useEffect(() => {
		const doc = container.ownerDocument;
		const body = doc.body;
		const win = doc.defaultView;

		const stack = new DisposableStack();
		const listeners = new AbortController();
		const { signal } = listeners;

		let mouseX = 0;
		let mouseY = 0;
		let raf = 0;
		stack.defer(() => cancelAnimationFrame(raf));
		stack.defer(() => listeners.abort());
		stack.defer(() => clearAnchoredBlock());

		const updatePosition = () => {
			const selected = getBlockAtPosition(doc, mouseX, mouseY);

			if (!selected) {
				hide();
				return;
			}

			setVisible(true);

			const { block, marginBlockEnd } = selected;
			const blockEl = block.el;

			if (anchoredBlockElRef.current !== blockEl) {
				clearAnchoredBlock();
				anchoredBlockElRef.current = blockEl;
			}

			const anchorNames = applyBlockMenuAnchors(blockEl);
			setItemAnchors(anchorNames.map((anchorName) => ({ anchorName })));
			setMargin({
				marginBlockEnd,
				marginBlockEndValue:
					win?.getComputedStyle(blockEl).getPropertyValue('--bge-block-margin') ?? '0px',
			});

			const itemEntries = [...blockEl.querySelectorAll<HTMLElement>('[data-bgi]')]
				.map((itemEl) => ({ el: itemEl, item: Item.getInstance(itemEl) }))
				.filter(
					(entry): entry is { el: HTMLElement; item: Item<ItemData, {}> } =>
						entry.item != null,
				);
			itemsRef.current = itemEntries.map((entry) => entry.item);

			engine.setCurrentBlock(block);
		};

		const scheduleUpdate = () => {
			if (signal.aborted) {
				return;
			}
			cancelAnimationFrame(raf);

			if (engine.isProcessed) {
				hide();
				return;
			}

			raf = requestAnimationFrame(() => {
				updatePosition();
			});
		};

		const onMouseMove = (e: MouseEvent) => {
			mouseX = e.pageX;
			mouseY = e.pageY;
			scheduleUpdate();
		};

		const onHideEvent = () => hide();

		body.addEventListener('mousemove', onMouseMove, { signal });
		body.addEventListener('mouseleave', onHideEvent, { signal });
		doc.addEventListener('mouseleave', onHideEvent, { signal });
		win?.addEventListener('mouseleave', onHideEvent, { signal });
		globalThis.addEventListener('resize', onHideEvent, { signal });

		return () => stack.dispose();
	}, [engine, container, hide, clearAnchoredBlock]);

	const isMutable = currentBlock?.isMutable() ?? false;

	return (
		<BlockMenuView
			rootRef={rootRef}
			menuId={menuId}
			commandBusId={engine.commandBus.receiverId}
			visible={visible}
			margin={margin}
			itemAnchors={itemAnchors}
			isMutable={isMutable}
		/>
	);
}
