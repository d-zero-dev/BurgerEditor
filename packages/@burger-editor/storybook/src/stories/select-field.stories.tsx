import type { Meta, StoryObj } from '@storybook/react-vite';

import { SelectField } from '@burger-editor/client/ui';
import { fn } from 'storybook/test';

const meta = {
	title: 'Client/Form/SelectField',
	component: SelectField,
} satisfies Meta<typeof SelectField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		label: '種類',
		name: 'bge-kind',
		value: 'normal',
		options: [
			{ value: 'normal', label: '通常' },
			{ value: 'wide', label: 'ワイド' },
			{ value: 'full', label: '全幅' },
		],
		onChange: fn(),
	},
};

export const Disabled: Story = {
	args: {
		...Default.args,
		disabled: true,
	},
};
