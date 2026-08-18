import type { Meta, StoryObj } from '@storybook/react-vite';

import { DraftSwitcher } from '@burger-editor/client/ui';

import { createMockEngine } from '../mocks/create-mock-engine.js';

const meta = {
	title: 'Client/Components/DraftSwitcher',
	component: DraftSwitcher,
	// エディタ本体の外側（編集エリアの直前）に配置されるUIのため、
	// dialog/block-menuではラップしない
	parameters: { wrapper: 'none' },
} satisfies Meta<typeof DraftSwitcher>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Main: Story = {
	args: {
		engine: createMockEngine({
			content: { type: 'main' },
			hasDraft: () => true,
		}),
	},
};

export const Draft: Story = {
	args: {
		engine: createMockEngine({
			content: { type: 'draft' },
			hasDraft: () => true,
		}),
	},
};
