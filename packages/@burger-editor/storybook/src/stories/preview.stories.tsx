import type { BurgerEditorEngine } from '@burger-editor/core';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { EngineProvider, Preview } from '@burger-editor/client/ui';
import { ComponentObserver } from '@burger-editor/core';

import placeholderImage from '../assets/placeholder-image.svg?url';

// Preview は engine.componentObserver の file-upload-progress 購読のみ
// 使用する（useEngine()経由）。ComponentObserver は本物のクラスをそのまま
// インスタンス化できる（window.dispatchEventの薄いラッパーで副作用が安全
// なため）
const fakeEngine = {
	componentObserver: new ComponentObserver(),
} as unknown as BurgerEditorEngine;

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
