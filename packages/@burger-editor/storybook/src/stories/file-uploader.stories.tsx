import type { Meta, StoryObj } from '@storybook/react-vite';

import { FileUploader } from '@burger-editor/client/ui';

import placeholderImage from '../assets/placeholder-image.svg?url';
import { createMockEngine } from '../mocks/create-mock-engine.js';

const meta = {
	title: 'Client/Components/FileUploader',
	component: FileUploader,
} satisfies Meta<typeof FileUploader>;

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
