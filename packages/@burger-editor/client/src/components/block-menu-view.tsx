import type { Ref, CSSProperties } from 'react';

import { BGE_COMMAND } from '@burger-editor/core';
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

import { BlockMenuButton } from './block-menu-button.js';
import styles from './block-menu.module.css';

/**
 * 選択中ブロックの下マージン表示用。`BlockMenu` がブロック要素の
 * 算出スタイルから読み取り、余白インジケータ（`.bgeMenuMargin`）に渡す。
 * 位置とサイズは CSS アンカー配置（`--bge-current-block`）で追従する。
 * @example
 * ```ts
 * const margin: BlockMenuMargin = {
 * 	marginBlockEnd: 16,
 * 	marginBlockEndValue: '1em',
 * };
 * ```
 */
export interface BlockMenuMargin {
	/** ブロック要素の `margin-block-end` 算出値（px） */
	readonly marginBlockEnd: number;
	/** `margin-block-end` のCSS値そのまま（例: `'1em'`） */
	readonly marginBlockEndValue: string;
}

/**
 * ブロック内の各アイテム（`[data-bgi]`）に付与した CSS アンカー名。
 * 対応する DOM 要素の `anchor-name` と一致し、オーバーレイの
 * `position-anchor` が参照する。
 * @example
 * ```ts
 * const anchor: ItemOverlayAnchor = { anchorName: '--bge-block-menu-item-0' };
 * ```
 */
export interface ItemOverlayAnchor {
	readonly anchorName: string;
}

/**
 * @deprecated {@link BlockMenuMargin} に置き換え。位置・サイズはアンカー配置で決まる。
 */
export type MenuGeometry = BlockMenuMargin & {
	readonly width: number;
	readonly height: number;
	readonly x: number;
	readonly y: number;
};

/**
 * @deprecated {@link ItemOverlayAnchor} に置き換え。
 */
export type ItemOverlayRect = ItemOverlayAnchor & {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
};

/**
 * `BlockMenu` の描画専用の中身。マウス追跡・`BurgerBlock` 解決・
 * `engine` 接続は一切持たず、マージンとアイテムアンカーを props で
 * 受け取って並べるだけの純粋なプレゼンテーションコンポーネント。
 *
 * `BurgerBlock` の実インスタンス生成なしに見た目だけ確認したい用途
 * （Storybook）のために `BlockMenu` から切り出されている。
 * @param root0
 * @param root0.rootRef
 * @param root0.menuId
 * @param root0.commandBusId
 * @param root0.visible
 * @param root0.margin
 * @param root0.itemAnchors
 * @param root0.isMutable
 * @example
 * ```tsx
 * <BlockMenuView
 * 	rootRef={rootRef}
 * 	menuId="bge-block-menu"
 * 	commandBusId={engine.commandBus.receiverId}
 * 	visible
 * 	margin={{ marginBlockEnd: 0, marginBlockEndValue: '0px' }}
 * 	itemAnchors={[{ anchorName: '--bge-block-menu-item-0' }]}
 * 	isMutable
 * />
 * ```
 */
export function BlockMenuView({
	rootRef,
	menuId,
	commandBusId,
	visible,
	margin,
	itemAnchors,
	isMutable,
}: {
	readonly rootRef: Ref<HTMLDivElement>;
	readonly menuId: string;
	/** 同一documentに複数エンジンが存在する場合の配送先。`engine.commandBus.receiverId` */
	readonly commandBusId: string;
	readonly visible: boolean;
	readonly margin: BlockMenuMargin;
	readonly itemAnchors: readonly ItemOverlayAnchor[];
	readonly isMutable: boolean;
}) {
	return (
		<div
			ref={rootRef}
			id={menuId}
			hidden={!visible}
			className={styles['bgeMenuBase']}
			style={
				{
					'--margin-block-end': `${margin.marginBlockEnd}px`,
				} as CSSProperties
			}>
			{itemAnchors.map((item, index) => (
				<button
					key={item.anchorName}
					type="button"
					className={styles['bgeItemOverlay']}
					aria-label="コンテンツを編集"
					command="--open-item-editor"
					commandfor={menuId}
					value={index}
					style={
						{
							'--item-anchor': item.anchorName,
						} as CSSProperties
					}></button>
			))}
			<div className={styles['bgeMenu']}>
				<div className={styles['bgeMoveGroup']}>
					<BlockMenuButton
						label="ひとつ上へ移動"
						command={BGE_COMMAND.moveBlock}
						commandfor={commandBusId}
						value="up">
						<IconArrowBigUpLine />
					</BlockMenuButton>
					<BlockMenuButton
						label="ひとつ下へ移動"
						command={BGE_COMMAND.moveBlock}
						commandfor={commandBusId}
						value="down">
						<IconArrowBigDownLine />
					</BlockMenuButton>
				</div>
				<div className={styles['bgeStandardGroup']}>
					<BlockMenuButton
						label="上にブロックを追加"
						command={BGE_COMMAND.insertBlock}
						commandfor={commandBusId}
						value="before">
						<IconRowInsertTop />
					</BlockMenuButton>
					<BlockMenuButton
						label="下にブロックを追加"
						command={BGE_COMMAND.insertBlock}
						commandfor={commandBusId}
						value="after">
						<IconRowInsertBottom />
					</BlockMenuButton>
					{isMutable ? (
						<>
							<BlockMenuButton
								label="ブロック内に要素を追加"
								command={BGE_COMMAND.updateGridItems}
								commandfor={commandBusId}
								value="+1">
								<IconLayoutGridAdd />
							</BlockMenuButton>
							<BlockMenuButton
								label="ブロック内の要素を削除"
								command={BGE_COMMAND.updateGridItems}
								commandfor={commandBusId}
								value="-1">
								<IconLayoutGridRemove />
							</BlockMenuButton>
						</>
					) : null}
					<BlockMenuButton
						label="オプション設定"
						command={BGE_COMMAND.openBlockOptions}
						commandfor={commandBusId}>
						<IconSettings />
					</BlockMenuButton>
					<BlockMenuButton
						label="ブロックをコピー"
						command={BGE_COMMAND.copyBlock}
						commandfor={commandBusId}>
						<IconClipboardPlus />
					</BlockMenuButton>
					<BlockMenuButton
						label="ブロックを削除"
						command={BGE_COMMAND.removeBlock}
						commandfor={commandBusId}>
						<IconTrash />
					</BlockMenuButton>
				</div>
			</div>
			<div className={styles['bgeMenuMargin']}>
				<span>
					余白: {margin.marginBlockEndValue} ({margin.marginBlockEnd}px)
				</span>
			</div>
		</div>
	);
}
