import type { Meta, StoryObj } from '@storybook/react-vite';

import { DraftSwitcher } from '@burger-editor/client/ui';

import { createMockEngine } from '../mocks/create-mock-engine.js';

const meta = {
	title: 'Client/Components/DraftSwitcher',
	component: DraftSwitcher,
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
