import type { Meta, StoryObj } from '@storybook/react-vite';

import { FrontMatterEditorView } from '@burger-editor/client/ui';
import { fn } from 'storybook/test';

const meta = {
	title: 'Client/Components/FrontMatterEditor',
	component: FrontMatterEditorView,
} satisfies Meta<typeof FrontMatterEditorView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		initialData: {
			title: 'ページタイトル',
			description: 'ページの説明文です。',
			publishedAt: '2026-08-01',
		},
		onDataChange: fn(),
	},
};

export const Empty: Story = {
	args: {
		initialData: {},
		onDataChange: fn(),
	},
};

export const MixedFieldTypes: Story = {
	args: {
		initialData: {
			title: 'ページタイトル',
			viewCount: 128,
			isPublished: true,
			publishedAt: '2026-08-01',
			tags: ['news', 'release'],
		},
		onDataChange: fn(),
	},
};
