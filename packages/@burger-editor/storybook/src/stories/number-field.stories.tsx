import type { Meta, StoryObj } from '@storybook/react-vite';

import { NumberField } from '@burger-editor/client/ui';
import { fn } from 'storybook/test';

const meta = {
	title: 'Client/Form/NumberField',
	component: NumberField,
} satisfies Meta<typeof NumberField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		label: '表示件数',
		name: 'bge-count',
		value: 3,
		min: 1,
		onChange: fn(),
	},
};

export const WithRange: Story = {
	args: {
		...Default.args,
		min: 1,
		max: 10,
		step: 1,
	},
};

export const Disabled: Story = {
	args: {
		...Default.args,
		disabled: true,
	},
};
