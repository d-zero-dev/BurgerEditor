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

/**
 * 支援技術に「必須」と伝える。ダイアログのフォームは `noValidate` なので、ブラウザは
 * 送信を止めない（空を拒むのはアイテムの `toItemData`）
 */
export const Required: Story = {
	args: {
		...Default.args,
		label: '画像の代替テキスト(alt)',
		name: 'bge-alt-editable',
		value: '',
		required: true,
	},
};

export const Disabled: Story = {
	args: {
		...Default.args,
		disabled: true,
	},
};
