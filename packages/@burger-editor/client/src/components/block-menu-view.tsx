import type { RefObject, CSSProperties } from 'react';

import { BGE_COMMAND, COMMAND_BUS_ID } from '@burger-editor/core';
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
 * 選択中ブロックの位置・サイズ・下マージン。座標とサイズはドキュメント
 * 座標系のpx。`BlockMenu` が `getBlockAtPosition` の戻り値から算出し、
 * `BlockMenuView` はこれをCSSカスタムプロパティに変換してメニューを
 * ブロックに追従させる。
 * @example
 * ```ts
 * const geometry: MenuGeometry = {
 * 	width: 320,
 * 	height: 120,
 * 	x: 0,
 * 	y: 0,
 * 	marginBlockEnd: 16,
 * 	marginBlockEndValue: '1em',
 * };
 * ```
 */
export interface MenuGeometry {
	readonly width: number;
	readonly height: number;
	readonly x: number;
	readonly y: number;
	/** ブロック要素の `margin-block-end` 算出値（px） */
	readonly marginBlockEnd: number;
	/** `margin-block-end` のCSS値そのまま（例: `'1em'`） */
	readonly marginBlockEndValue: string;
}

/**
 * ブロック内の各アイテム（`[data-bgi]`要素）のオーバーレイ矩形。
 * 座標はブロック左上を原点とした相対px。クリックするとそのアイテムの
 * エディタが開く透明ボタンの位置決めに使う。
 * @example
 * ```ts
 * const rect: ItemOverlayRect = { x: 8, y: 8, width: 140, height: 40 };
 * ```
 */
export interface ItemOverlayRect {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
}

/**
 * `BlockMenu` の描画専用の中身。マウス追跡・`BurgerBlock` 解決・
 * `engine` 接続は一切持たず、位置とアイテム矩形を props で受け取って
 * 並べるだけの純粋なプレゼンテーションコンポーネント。
 *
 * `BurgerBlock` の実インスタンス生成なしに見た目だけ確認したい用途
 * （Storybook）のために `BlockMenu` から切り出されている。
 * @param root0
 * @param root0.rootRef
 * @param root0.menuId
 * @param root0.visible
 * @param root0.geometry
 * @param root0.itemRects
 * @param root0.isMutable
 * @example
 * ```tsx
 * <BlockMenuView
 * 	rootRef={rootRef}
 * 	menuId="bge-block-menu"
 * 	visible
 * 	geometry={{ width: 100, height: 40, x: 0, y: 0, marginBlockEnd: 0, marginBlockEndValue: '0px' }}
 * 	itemRects={[]}
 * 	isMutable
 * />
 * ```
 */
export function BlockMenuView({
	rootRef,
	menuId,
	visible,
	geometry,
	itemRects,
	isMutable,
}: {
	readonly rootRef: RefObject<HTMLDivElement | null>;
	readonly menuId: string;
	readonly visible: boolean;
	readonly geometry: MenuGeometry;
	readonly itemRects: readonly ItemOverlayRect[];
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
					'--width': `${geometry.width}px`,
					'--height': `${geometry.height}px`,
					'--x': `${geometry.x}px`,
					'--y': `${geometry.y}px`,
					'--margin-block-end': `${geometry.marginBlockEnd ?? '0'}px`,
				} as CSSProperties
			}>
			{itemRects.map((rect, index) => (
				<button
					key={index}
					type="button"
					className={styles['bgeItemOverlay']}
					aria-label="コンテンツを編集"
					command="--open-item-editor"
					commandfor={menuId}
					value={index}
					style={{
						insetInlineStart: `${rect.x}px`,
						insetBlockStart: `${rect.y}px`,
						inlineSize: `${rect.width}px`,
						blockSize: `${rect.height}px`,
					}}></button>
			))}
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
