import type { Meta, StoryObj } from '@storybook/react-vite';

import { Tabs } from '@burger-editor/client/ui';
import { fn } from 'storybook/test';

const meta = {
	title: 'Client/Components/Tabs',
	component: Tabs,
	args: {
		onChange: fn(),
	},
} satisfies Meta<typeof Tabs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		current: 0,
		contentId: 'tab-content',
		length: 3,
	},
};

export const CustomLabel: Story = {
	args: {
		current: 1,
		contentId: 'tab-content-custom',
		length: 3,
		createLabel: (index) => `パターン${index + 1}`,
	},
};
