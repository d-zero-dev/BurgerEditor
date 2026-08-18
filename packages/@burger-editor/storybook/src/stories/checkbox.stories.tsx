import type { Meta, StoryObj } from '@storybook/react-vite';

import { Checkbox } from '@burger-editor/client/ui';
import { fn } from 'storybook/test';

const meta = {
	title: 'Client/Form/Checkbox',
	component: Checkbox,
	args: {
		onChange: fn(),
	},
} satisfies Meta<typeof Checkbox>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Unchecked: Story = {
	args: {
		label: '横スクロール可能',
		name: 'bge-scrollable',
		checked: false,
	},
};

export const Checked: Story = {
	args: {
		label: '横スクロール可能',
		name: 'bge-scrollable',
		checked: true,
	},
};

export const Disabled: Story = {
	args: {
		label: '横スクロール可能',
		name: 'bge-scrollable',
		checked: false,
		disabled: true,
	},
};
