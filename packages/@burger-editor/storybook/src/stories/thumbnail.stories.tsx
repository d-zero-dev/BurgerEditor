import type { Meta, StoryObj } from '@storybook/react-vite';

import { Thumbnail } from '@burger-editor/client/ui';

const meta = {
	title: 'Client/Components/Thumbnail',
	component: Thumbnail,
} satisfies Meta<typeof Thumbnail>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Image: Story = {
	args: {
		src: 'https://example.com/photo.jpg',
	},
};

export const Video: Story = {
	args: {
		src: 'https://example.com/movie.mp4',
	},
};

export const Audio: Story = {
	args: {
		src: 'https://example.com/sound.mp3',
	},
};

export const Document: Story = {
	args: {
		src: 'https://example.com/document.docx',
	},
};

export const Pdf: Story = {
	args: {
		src: 'https://example.com/document.pdf',
	},
};

export const GenericFile: Story = {
	args: {
		src: 'https://example.com/archive.zip',
	},
};
