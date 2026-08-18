import type { Meta, StoryObj } from '@storybook/react-vite';

import { EditableAreaView } from '@burger-editor/client/ui';
import { fn } from 'storybook/test';

import { createMockEngine } from '../mocks/create-mock-engine.js';

/**
 * iframe内にコンテンツを表示するシェル。`BlockMenu`（ホバーメニュー）
 * を内部で使うが、`BurgerBlock` の実インスタンスがない状態ではマウス
 * オーバーしてもメニューは表示されない（`getBlockAtPosition` が
 * `null` を返して自己回復するだけ、詳細は `BlockMenuView` の story を
 * 参照）。ここではiframeのコンテンツ表示・高さ追従の見た目確認に限る。
 */
const meta = {
	title: 'Client/Components/EditableAreaView',
	component: EditableAreaView,
	// 編集エリア本体（iframeシェル）のため、dialog/block-menuではラップしない
	parameters: { wrapper: 'none' },
} satisfies Meta<typeof EditableAreaView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Main: Story = {
	args: {
		engine: createMockEngine({ content: { type: 'main' } }),
		type: 'main',
		initialContent: '<p>サンプルコンテンツです。</p>',
		stylesheets: [],
		classList: [],
		onReady: fn(),
	},
};

export const Empty: Story = {
	args: {
		...Main.args,
		engine: createMockEngine({ content: { type: 'main' } }),
		initialContent: '',
	},
};

export const Draft: Story = {
	args: {
		engine: createMockEngine({ content: { type: 'draft' }, hasDraft: () => true }),
		type: 'draft',
		initialContent: '<p>下書きのコンテンツです。</p>',
		stylesheets: [],
		classList: [],
		onReady: fn(),
	},
};
