import type { Meta, StoryObj } from '@storybook/react-vite';

import { TextArea } from '@burger-editor/client/ui';
import { fn } from 'storybook/test';

const meta = {
	title: 'Client/Form/TextArea',
	component: TextArea,
} satisfies Meta<typeof TextArea>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		label: '説明文',
		name: 'bge-text',
		value: 'ここに説明文を入力します。',
		onChange: fn(),
	},
};

export const WithRows: Story = {
	args: {
		...Default.args,
		rows: 5,
	},
};

export const Disabled: Story = {
	args: {
		...Default.args,
		disabled: true,
	},
};
