import type { Meta, StoryObj } from '@storybook/react-vite';

import { TextField } from '@burger-editor/client/ui';
import { fn } from 'storybook/test';

const meta = {
	title: 'Client/Form/TextField',
	component: TextField,
} satisfies Meta<typeof TextField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		label: 'URL',
		name: 'bge-link',
		value: 'https://example.com',
		onChange: fn(),
	},
};

export const Email: Story = {
	args: {
		...Default.args,
		label: 'メールアドレス',
		name: 'bge-email',
		type: 'email',
		value: 'user@example.com',
	},
};

export const WithPlaceholder: Story = {
	args: {
		...Default.args,
		value: '',
		placeholder: 'https://example.com',
	},
};

export const Disabled: Story = {
	args: {
		...Default.args,
		disabled: true,
	},
};
