import type { BurgerBlock, BurgerEditorEngine } from '@burger-editor/core';
import type { CSSProperties } from 'react';

import { BGE_COMMAND, COMMAND_BUS_ID, getBlockAtPosition } from '@burger-editor/core';
import {
	IconArrowBigDownLine,
	IconArrowBigUpLine,
	IconClipboardPlus,
	IconLayoutGridAdd,
	IconLayoutGridRemove,
	IconRowInsertBottom,
	IconRowInsertTop,
	IconSettings,
	IconTrash,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';

import { BlockMenuButton } from './block-menu-button.js';
import styles from './block-menu.module.css';

interface MenuGeometry {
	readonly width: number;
	readonly height: number;
	readonly x: number;
	readonly y: number;
	readonly marginBlockEnd: number;
	readonly marginBlockEndValue: string;
}

/**
 * Hover menu over the selected block inside the editable area iframe.
 * Block operations are declared as engine commands; positioning and
 * visibility stay local to this component.
 * @param root0
 * @param root0.engine
 * @param root0.container
 * @param root0.onHide
 */
export function BlockMenu({
	engine,
	container,
	onHide,
}: {
	readonly engine: BurgerEditorEngine;
	readonly container: HTMLElement;
	readonly onHide: () => void;
}) {
	const [currentBlock, setCurrentBlock] = useState<BurgerBlock | null>(null);
	const [visible, setVisible] = useState(false);
	const [geometry, setGeometry] = useState<MenuGeometry>({
		width: 0,
		height: 0,
		x: 0,
		y: 0,
		marginBlockEnd: 0,
		marginBlockEndValue: '0px',
	});

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

		const hide = () => {
			setVisible(false);
			setCurrentBlock(null);
			onHide();
		};

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
	}, [engine, container, onHide]);

	if (!visible) {
		return null;
	}

	const isMutable = currentBlock?.isMutable();

	return (
		<div
			className={styles['bgeMenuBase']}
			style={
				{
					'--width': `${geometry.width}px`,
					'--height': `${geometry.height}px`,
					'--x': `${geometry.x}px`,
					'--y': `${geometry.y}px`,
					'--margin-block-end': `${geometry.marginBlockEnd ?? '0'}px`,
				} as CSSProperties
			}>
			<div className={styles['bgeMenu']}>
				<div className={styles['bgeMoveGroup']}>
					<BlockMenuButton
						label="ひとつ上へ移動"
						command={BGE_COMMAND.moveBlock}
						commandfor={COMMAND_BUS_ID}
						value="up">
						<IconArrowBigUpLine />
					</BlockMenuButton>
					<BlockMenuButton
						label="ひとつ下へ移動"
						command={BGE_COMMAND.moveBlock}
						commandfor={COMMAND_BUS_ID}
						value="down">
						<IconArrowBigDownLine />
					</BlockMenuButton>
				</div>
				<div className={styles['bgeStandardGroup']}>
					<BlockMenuButton
						label="上にブロックを追加"
						command={BGE_COMMAND.insertBlock}
						commandfor={COMMAND_BUS_ID}
						value="before">
						<IconRowInsertTop />
					</BlockMenuButton>
					<BlockMenuButton
						label="下にブロックを追加"
						command={BGE_COMMAND.insertBlock}
						commandfor={COMMAND_BUS_ID}
						value="after">
						<IconRowInsertBottom />
					</BlockMenuButton>
					{isMutable ? (
						<>
							<BlockMenuButton
								label="ブロック内に要素を追加"
								command={BGE_COMMAND.updateGridItems}
								commandfor={COMMAND_BUS_ID}
								value="+1">
								<IconLayoutGridAdd />
							</BlockMenuButton>
							<BlockMenuButton
								label="ブロック内の要素を削除"
								command={BGE_COMMAND.updateGridItems}
								commandfor={COMMAND_BUS_ID}
								value="-1">
								<IconLayoutGridRemove />
							</BlockMenuButton>
						</>
					) : null}
					<BlockMenuButton
						label="オプション設定"
						command={BGE_COMMAND.openBlockOptions}
						commandfor={COMMAND_BUS_ID}>
						<IconSettings />
					</BlockMenuButton>
					<BlockMenuButton
						label="ブロックをコピー"
						command={BGE_COMMAND.copyBlock}
						commandfor={COMMAND_BUS_ID}>
						<IconClipboardPlus />
					</BlockMenuButton>
					<BlockMenuButton
						label="ブロックを削除"
						command={BGE_COMMAND.removeBlock}
						commandfor={COMMAND_BUS_ID}>
						<IconTrash />
					</BlockMenuButton>
				</div>
			</div>
			<div className={styles['bgeMenuMargin']}>
				<span>
					余白: {geometry.marginBlockEndValue} ({geometry.marginBlockEnd}px)
				</span>
			</div>
		</div>
	);
}
