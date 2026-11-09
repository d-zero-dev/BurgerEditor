import type { Meta, StoryObj } from '@storybook/react-vite';

import { BlockMenuView, BGE_BLOCK_MENU_BLOCK_ANCHOR } from '@burger-editor/client/ui';
import { useRef } from 'react';

/**
 * `BlockMenu` の描画専用コンポーネント。実際の `BlockMenu` はマウス位置
 * から `BurgerBlock` の実インスタンスを解決して表示するが、この story
 * ではマージンとアイテムアンカーをダミーの props として直接渡すことで、
 * `BurgerBlock` 生成なしに見た目を確認する。
 */
const meta = {
	title: 'Client/Components/BlockMenuView',
	component: BlockMenuView,
	// [data-bge-component='block-menu'] の子孫としてのみui.cssのボタン
	// スタイルが当たる
	parameters: { wrapper: 'block-menu' },
	render: (args) => {
		// eslint-disable-next-line react-hooks/rules-of-hooks
		const rootRef = useRef<HTMLDivElement>(null);
		return (
			<>
				<div
					style={{
						anchorName: BGE_BLOCK_MENU_BLOCK_ANCHOR,
						width: 320,
						height: 120,
						marginBlockEnd: 16,
						background: 'var(--bge-lightest-color, #f5f5f5)',
					}}
				/>
				<BlockMenuView {...args} rootRef={rootRef} />
			</>
		);
	},
} satisfies Meta<typeof BlockMenuView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		menuId: 'bge-block-menu-default',
		commandBusId: 'bge-command-bus-story',
		visible: true,
		margin: {
			marginBlockEnd: 16,
			marginBlockEndValue: '1em',
		},
		itemAnchors: [],
		isMutable: false,
	},
};

export const Mutable: Story = {
	args: {
		...Default.args,
		menuId: 'bge-block-menu-mutable',
		isMutable: true,
	},
};

export const WithItemOverlays: Story = {
	render: (args) => {
		// eslint-disable-next-line react-hooks/rules-of-hooks
		const rootRef = useRef<HTMLDivElement>(null);
		return (
			<>
				<div
					style={{
						anchorName: BGE_BLOCK_MENU_BLOCK_ANCHOR,
						width: 320,
						height: 120,
						marginBlockEnd: 16,
						background: 'var(--bge-lightest-color, #f5f5f5)',
						position: 'relative',
					}}>
					<div
						data-bgi=""
						style={{
							anchorName: '--bge-block-menu-item-0',
							position: 'absolute',
							insetBlockStart: 8,
							insetInlineStart: 8,
							width: 140,
							height: 40,
							background: 'rgb(12 126 158 / 15%)',
						}}
					/>
					<div
						data-bgi=""
						style={{
							anchorName: '--bge-block-menu-item-1',
							position: 'absolute',
							insetBlockStart: 56,
							insetInlineStart: 8,
							width: 140,
							height: 40,
							background: 'rgb(12 126 158 / 15%)',
						}}
					/>
				</div>
				<BlockMenuView {...args} rootRef={rootRef} />
			</>
		);
	},
	args: {
		...Default.args,
		menuId: 'bge-block-menu-with-items',
		itemAnchors: [
			{ anchorName: '--bge-block-menu-item-0' },
			{ anchorName: '--bge-block-menu-item-1' },
		],
	},
};
