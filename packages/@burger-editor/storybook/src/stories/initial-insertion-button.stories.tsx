import type { Meta, StoryObj } from '@storybook/react-vite';

import { InitialInsertionButton } from '@burger-editor/client/ui';

const meta = {
	title: 'Client/Components/InitialInsertionButton',
	component: InitialInsertionButton,
	// 編集エリア内（dialog外）に配置されるボタンのためラップしない
	parameters: { wrapper: 'none' },
} satisfies Meta<typeof InitialInsertionButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
