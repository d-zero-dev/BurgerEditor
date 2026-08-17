import type { Meta, StoryObj } from '@storybook/react-vite';

import { InitialInsertionButton } from '@burger-editor/client/ui';

const meta = {
	title: 'Client/Components/InitialInsertionButton',
	component: InitialInsertionButton,
} satisfies Meta<typeof InitialInsertionButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
