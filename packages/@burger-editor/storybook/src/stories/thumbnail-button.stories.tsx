import type { Meta, StoryObj } from '@storybook/react-vite';

import { ThumbnailButton } from '@burger-editor/client/ui';

import placeholderImage from '../assets/placeholder-image.svg?url';

// ボタンが送る command の宛先（`commandfor`）はこの story には置いていないので、
// 押しても何も起きない。見た目（ホバー・フォーカス・プレースホルダー）の確認用
const meta = {
	title: 'Client/Components/ThumbnailButton',
	component: ThumbnailButton,
	args: {
		label: '編集',
		'aria-label': 'スライド1を編集',
		command: '--edit',
		commandfor: 'story-target',
		value: '0',
	},
} satisfies Meta<typeof ThumbnailButton>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * ホバー、またはキーボードでフォーカスすると「編集」が重なる
 */
export const Image: Story = {
	args: {
		src: placeholderImage,
	},
};

/**
 * 画像がないときも同じ大きさのプレースホルダーで領域を確保する
 */
export const Placeholder: Story = {
	args: {
		src: '',
	},
};
