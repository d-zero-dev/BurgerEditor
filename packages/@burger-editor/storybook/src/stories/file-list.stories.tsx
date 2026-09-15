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
 * `FileList` はマウント後、`file-select` イベント経由の初回 fetch で
 * リストを取得する設計のため、初期表示状態を再現するには `play` で
 * `file-listup` イベントを明示的に発火させる
 */
export const Default: Story = {
	args: {
		engine: createMockEngine(),
		fileType: 'image',
	},
	play: ({ args }) => {
		args.engine.componentObserver.notify('file-listup', {
			fileType: args.fileType,
			data: dummyFiles,
		});
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
	play: ({ args }) => {
		args.engine.componentObserver.notify('file-select', {
			path: '',
			fileSize: 0,
			isEmpty: true,
			isMounted: false,
		});
	},
};

export const Empty: Story = {
	args: {
		engine: createMockEngine(),
		fileType: 'image',
	},
};
