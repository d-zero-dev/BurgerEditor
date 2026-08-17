import type { Meta, StoryObj } from '@storybook/react-vite';

import { TableEditor } from '@burger-editor/client/ui';
import { fn } from 'storybook/test';

const meta = {
	title: 'Client/Components/TableEditor',
	component: TableEditor,
	args: {
		onChange: fn(),
	},
} satisfies Meta<typeof TableEditor>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		value: {
			th: ['項目', '価格', '在庫'],
			td: ['りんご', '150円', '10個'],
		},
	},
};

export const SingleRow: Story = {
	args: {
		value: {
			th: ['項目'],
			td: ['りんご'],
		},
	},
};
