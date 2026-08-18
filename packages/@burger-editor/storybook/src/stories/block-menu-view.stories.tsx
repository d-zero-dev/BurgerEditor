import type { Meta, StoryObj } from '@storybook/react-vite';

import { BlockMenuView } from '@burger-editor/client/ui';
import { useRef } from 'react';

/**
 * `BlockMenu` の描画専用コンポーネント。実際の `BlockMenu` はマウス位置
 * から `BurgerBlock` の実インスタンスを解決して表示するが、この story
 * では位置とアイテム矩形をダミーの props として直接渡すことで、
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
		return <BlockMenuView {...args} rootRef={rootRef} />;
	},
} satisfies Meta<typeof BlockMenuView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		menuId: 'bge-block-menu-default',
		visible: true,
		geometry: {
			width: 320,
			height: 120,
			x: 0,
			y: 0,
			marginBlockEnd: 16,
			marginBlockEndValue: '1em',
		},
		itemRects: [],
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
	args: {
		...Default.args,
		menuId: 'bge-block-menu-with-items',
		itemRects: [
			{ x: 8, y: 8, width: 140, height: 40 },
			{ x: 8, y: 56, width: 140, height: 40 },
		],
	},
};
