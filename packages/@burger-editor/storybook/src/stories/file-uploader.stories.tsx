import type { BurgerEditorEngine, FileType } from '@burger-editor/core';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { EngineProvider, FileUploader } from '@burger-editor/client/ui';

import placeholderImage from '../assets/placeholder-image.svg?url';
import { createMockEngine } from '../mocks/create-mock-engine.js';

/**
 * `FileUploader` reads the engine via `useEngine()`; this story-only
 * wrapper keeps the `{engine, fileType}` args shape the stories below use.
 * @param root0
 * @param root0.engine
 * @param root0.fileType
 */
function FileUploaderStory({
	engine,
	fileType,
}: {
	readonly engine: BurgerEditorEngine;
	readonly fileType: FileType;
}) {
	return (
		<EngineProvider engine={engine}>
			<FileUploader fileType={fileType} />
		</EngineProvider>
	);
}

const meta = {
	title: 'Client/Components/FileUploader',
	component: FileUploaderStory,
} satisfies Meta<typeof FileUploaderStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * ファイル選択自体はブラウザのセキュリティ制約でプログラムから再現でき
 * ないため、`postFile` をモックしたエンジンでボタン・inputの見た目のみ
 * を確認する
 */
export const Default: Story = {
	args: {
		engine: createMockEngine({
			serverAPI: {
				postFile: async (
					_fileType: string,
					_file: File,
					progress: (u: number, t: number) => void,
				) => {
					await progress(50, 100);
					return {
						error: false,
						uploaded: {
							fileId: '1',
							name: 'uploaded.jpg',
							url: placeholderImage,
							size: 102_400,
							timestamp: 1_754_006_400_000,
							sizes: {},
						},
						result: {
							error: false,
							data: [],
							pagination: { current: 0, total: 1 },
						},
					};
				},
			},
		}),
		fileType: 'image',
	},
};

export const PdfUploader: Story = {
	args: {
		engine: createMockEngine(),
		fileType: 'pdf',
	},
};
