import type { BurgerEditorEngine } from '@burger-editor/core';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { EngineProvider, Preview } from '@burger-editor/client/ui';

import placeholderImage from '../assets/placeholder-image.svg?url';

// Preview は engine の FileBrowserStore（useFileBrowser() 経由）から
// アップロード進捗だけを読む。ここではその進捗を発生させないので、
// 空のengineで足りる
const fakeEngine = {} as unknown as BurgerEditorEngine;

const meta = {
	title: 'Client/Components/Preview',
	component: Preview,
	decorators: [
		(Story) => (
			<EngineProvider engine={fakeEngine}>
				<Story />
			</EngineProvider>
		),
	],
} satisfies Meta<typeof Preview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Image: Story = {
	args: {
		path: placeholderImage,
	},
};

export const Video: Story = {
	args: {
		path: 'https://example.com/movie.mp4',
	},
};

export const Audio: Story = {
	args: {
		path: 'https://example.com/sound.mp3',
	},
};

export const Pdf: Story = {
	args: {
		path: 'https://example.com/document.pdf',
	},
};

export const Unsupported: Story = {
	args: {
		path: 'https://example.com/archive.zip',
	},
};
