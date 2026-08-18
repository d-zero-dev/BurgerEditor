import type { Meta, StoryObj } from '@storybook/react-vite';

import { Fieldset, TextField } from '@burger-editor/client/ui';
import { fn } from 'storybook/test';

const meta = {
	title: 'Client/Form/Fieldset',
	component: Fieldset,
} satisfies Meta<typeof Fieldset>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		legend: 'リンク設定',
		children: (
			<TextField
				label="URL"
				name="bge-href"
				value="https://example.com"
				onChange={fn()}
			/>
		),
	},
};

export const Disabled: Story = {
	args: {
		...Default.args,
		disabled: true,
	},
};
