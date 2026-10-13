import type { BurgerEditorEngine, FileListItem, FileType } from '@burger-editor/core';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { FileList, EngineProvider } from '@burger-editor/client/ui';

import placeholderImage from '../assets/placeholder-image.svg?url';
import { createMockEngine } from '../mocks/create-mock-engine.js';

/**
 * `FileList` reads the engine via `useEngine()`; this story-only wrapper
 * keeps the `{engine, fileType}` args shape the stories below use (and
 * that `play` reads `args.engine` from).
 * @param root0
 * @param root0.engine
 * @param root0.fileType
 */
function FileListStory({
	engine,
	fileType,
}: {
	readonly engine: BurgerEditorEngine;
	readonly fileType: FileType;
}) {
	return (
		<EngineProvider engine={engine}>
			<FileList fileType={fileType} />
		</EngineProvider>
	);
}

const dummyFiles: FileListItem[] = [
	{
		fileId: '1',
		name: 'photo-01.jpg',
		url: placeholderImage,
		size: 102_400,
		timestamp: 1_754_006_400_000,
		sizes: {},
	},
	{
		fileId: '2',
		name: 'photo-02.jpg',
		url: placeholderImage,
		size: 204_800,
		timestamp: 1_754_092_800_000,
		sizes: {},
	},
	{
		fileId: '3',
		name: 'photo-03.jpg',
		url: placeholderImage,
		size: 51_200,
		timestamp: 1_754_179_200_000,
		sizes: {},
	},
];

const meta = {
	title: 'Client/Components/FileList',
	component: FileListStory,
} satisfies Meta<typeof FileListStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * `FileList` はマウント時に `use()` で `getFileList` を読むだけなので、
 * 初期表示状態はその応答を直接差し込むだけで再現できる
 */
export const Default: Story = {
	args: {
		engine: createMockEngine({
			serverAPI: {
				getFileList: () =>
					Promise.resolve({
						error: false,
						data: dummyFiles,
						pagination: { current: 0, total: 1 },
					}),
			},
		}),
		fileType: 'image',
	},
};

export const MultiplePages: Story = {
	args: {
		engine: createMockEngine({
			serverAPI: {
				getFileList: () =>
					Promise.resolve({
						error: false,
						data: dummyFiles,
						pagination: { current: 0, total: 3 },
					}),
			},
		}),
		fileType: 'image',
	},
};

export const Empty: Story = {
	args: {
		engine: createMockEngine(),
		fileType: 'image',
	},
};
