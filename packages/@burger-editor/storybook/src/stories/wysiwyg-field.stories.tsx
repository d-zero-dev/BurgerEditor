import type { Meta, StoryObj } from '@storybook/react-vite';

import { WysiwygField } from '@burger-editor/client/ui';
import { fn } from 'storybook/test';

const meta = {
	title: 'Client/Components/WysiwygField',
	component: WysiwygField,
	// <bge-wysiwyg-editor> カスタムエレメントは .storybook/preview.tsx で
	// グローバルに一度だけ defineBgeWysiwygEditorElement() 登録している
	args: {
		onChange: fn(),
	},
} satisfies Meta<typeof WysiwygField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		itemName: 'wysiwyg',
		value: '<p>本文を入力してください。</p>',
		label: '本文',
	},
};

export const Empty: Story = {
	args: {
		itemName: 'wysiwyg',
		value: '',
		label: '本文',
	},
};
