import type {
	BlockCatalog as BlockCatalogData,
	BurgerEditorEngine,
} from '@burger-editor/core';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { BlockCatalog } from '@burger-editor/client/ui';

import placeholderImage from '../assets/placeholder-image.svg?url';

// BlockCatalog は engine.storageKey.blockClipboard の読み取りのみ使用する
// （sessionStorageのキー名）。他のengineサブシステムには依存しない
const fakeEngine = {
	storageKey: {
		blockClipboard: 'bge-copied-block',
	},
} as unknown as BurgerEditorEngine;

const catalog: BlockCatalogData = {
	テキスト: [
		{
			label: '見出し',
			definition: {
				name: 'heading',
				containerProps: {},
				items: [],
				img: placeholderImage,
			},
		},
		{
			label: '段落',
			definition: {
				name: 'paragraph',
				containerProps: {},
				items: [],
				svg: '<svg viewBox="0 0 24 24"><rect width="24" height="4" y="2"/><rect width="24" height="4" y="10"/><rect width="16" height="4" y="18"/></svg>',
			},
		},
	],
	メディア: [
		{
			label: '画像',
			definition: {
				name: 'image',
				containerProps: {},
				items: [],
				img: placeholderImage,
			},
		},
		{
			label: '動画',
			definition: {
				name: 'video',
				containerProps: {},
				items: [],
				img: placeholderImage,
			},
		},
	],
	レイアウト: [
		{
			label: 'カラム',
			definition: {
				name: 'columns',
				containerProps: {},
				items: [],
			},
		},
	],
};

const meta = {
	title: 'Client/Components/BlockCatalog',
	component: BlockCatalog,
} satisfies Meta<typeof BlockCatalog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		engine: fakeEngine,
		catalog,
	},
};
