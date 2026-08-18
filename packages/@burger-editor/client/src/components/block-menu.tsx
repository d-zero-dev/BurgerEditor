import type { MenuGeometry, ItemOverlayRect } from './block-menu-view.js';
import type { BurgerBlock, BurgerEditorEngine, ItemData } from '@burger-editor/core';
import type { RefObject } from 'react';

import { Item, getBlockAtPosition } from '@burger-editor/core';
import { useId, useEffect, useRef, useState, useCallback } from 'react';

import { useCommand } from '../use-command.js';

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
 * @param root0.engine
 * @param root0.container
 * @example
 * ```tsx
 * <BlockMenu engine={engine} container={frameBody} />
 * ```
 */
export function BlockMenu({
	engine,
	container,
}: {
	readonly engine: BurgerEditorEngine;
	readonly container: HTMLElement;
}) {
	const menuId = useId();
	const [currentBlock, setCurrentBlock] = useState<BurgerBlock | null>(null);
	const [visible, setVisible] = useState(false);
	const [itemRects, setItemRects] = useState<readonly ItemOverlayRect[]>([]);
	const itemsRef: RefObject<readonly Item<ItemData, {}>[]> = useRef([]);
	const [geometry, setGeometry] = useState<MenuGeometry>({
		width: 0,
		height: 0,
		x: 0,
		y: 0,
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

	const hide = useCallback(() => {
		setVisible(false);
		setCurrentBlock(null);
		engine.clearCurrentBlock();
	}, [engine]);

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
		const onBlockChange = (e: CustomEvent<{ readonly block: BurgerBlock }>) => {
			setCurrentBlock(e.detail.block);
		};
		engine.el.addEventListener('bge:block-change', onBlockChange);
		return () => {
			engine.el.removeEventListener('bge:block-change', onBlockChange);
		};
	}, [engine]);

	useEffect(() => {
		const doc = container.ownerDocument;
		const body = doc.body;
		const win = doc.defaultView;

		let mouseX = 0;
		let mouseY = 0;
		let raf = 0;

		const updatePosition = () => {
			const selected = getBlockAtPosition(doc, mouseX, mouseY);

			if (!selected) {
				hide();
				return;
			}

			setVisible(true);

			const { block, rect, marginBlockEnd } = selected;
			setCurrentBlock(block);
			setGeometry({
				width: rect.width,
				height: rect.height,
				x: rect.left,
				y: rect.top,
				marginBlockEnd,
				marginBlockEndValue: window
					.getComputedStyle(block.el)
					.getPropertyValue('--bge-block-margin'),
			});
			// rebindされたブロックはblock.itemsを持たないため、要素→Itemは
			// elMap（Item.getInstance）で解決する。未解決の要素（rebind処理中
			// など）はオーバーレイを描画せず、次のマウス移動更新で自己回復する
			const itemEntries = [...block.el.querySelectorAll<HTMLElement>('[data-bgi]')]
				.map((itemEl) => ({ el: itemEl, item: Item.getInstance(itemEl) }))
				.filter(
					(entry): entry is { el: HTMLElement; item: Item<ItemData, {}> } =>
						entry.item != null,
				);
			itemsRef.current = itemEntries.map((entry) => entry.item);
			setItemRects(
				itemEntries.map(({ el: itemEl }) => {
					const itemRect = itemEl.getBoundingClientRect();
					return {
						x: itemRect.left - rect.left,
						y: itemRect.top - rect.top,
						width: itemRect.width,
						height: itemRect.height,
					};
				}),
			);

			engine.componentObserver.notify('select-block', {
				block,
				width: rect.width,
				height: rect.height,
				x: rect.left,
				y: rect.top,
				marginBlockEnd,
			});
		};

		const scheduleUpdate = () => {
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

		body.addEventListener('mousemove', onMouseMove);
		body.addEventListener('mouseleave', onHideEvent);
		doc.addEventListener('mouseleave', onHideEvent);
		win?.addEventListener('mouseleave', onHideEvent);
		globalThis.addEventListener('resize', onHideEvent);
		engine.el.addEventListener('bge:saved', scheduleUpdate);

		const observer = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				for (const node of mutation.addedNodes) {
					if (!(node instanceof HTMLElement)) {
						continue;
					}
					const images = node.querySelectorAll('img');
					for (const img of images) {
						img.addEventListener('load', scheduleUpdate, { once: true });
						img.addEventListener('error', scheduleUpdate, { once: true });
						img.addEventListener('abort', scheduleUpdate, { once: true });
					}
				}
			}
		});
		observer.observe(doc, { childList: true, subtree: true });

		return () => {
			body.removeEventListener('mousemove', onMouseMove);
			body.removeEventListener('mouseleave', onHideEvent);
			doc.removeEventListener('mouseleave', onHideEvent);
			win?.removeEventListener('mouseleave', onHideEvent);
			globalThis.removeEventListener('resize', onHideEvent);
			engine.el.removeEventListener('bge:saved', scheduleUpdate);
			observer.disconnect();
			cancelAnimationFrame(raf);
		};
	}, [engine, container, hide]);

	const isMutable = currentBlock?.isMutable() ?? false;

	return (
		<BlockMenuView
			rootRef={rootRef}
			menuId={menuId}
			visible={visible}
			geometry={geometry}
			itemRects={itemRects}
			isMutable={isMutable}
		/>
	);
}
