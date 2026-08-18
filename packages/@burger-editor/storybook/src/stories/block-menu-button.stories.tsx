import type { Meta, StoryObj } from '@storybook/react-vite';

import { BlockMenuButton } from '@burger-editor/client/ui';
import { IconTrash } from '@tabler/icons-react';

const meta = {
	title: 'Client/Components/BlockMenuButton',
	component: BlockMenuButton,
	// BlockMenuView（block-menu内）で使われる部品のため文脈を揃える
	parameters: { wrapper: 'block-menu' },
} satisfies Meta<typeof BlockMenuButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		label: 'ブロックを削除',
		// Storybookのカタログ表示ではコマンドバスへの実際の接続は不要なため、
		// 見た目確認用のダミーIDを渡している
		command: '--remove-block',
		commandfor: 'bge-command-bus',
		children: <IconTrash />,
	},
};
