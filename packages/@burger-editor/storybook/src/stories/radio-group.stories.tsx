import type { Meta, StoryObj } from '@storybook/react-vite';

import { RadioGroup } from '@burger-editor/client/ui';
import { fn } from 'storybook/test';

const meta = {
	title: 'Client/Form/RadioGroup',
	component: RadioGroup,
} satisfies Meta<typeof RadioGroup>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		label: '配置',
		name: 'bge-align',
		value: 'start',
		options: [
			{ value: 'start', label: '左寄せ' },
			{ value: 'center', label: '中央' },
			{ value: 'end', label: '右寄せ' },
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
