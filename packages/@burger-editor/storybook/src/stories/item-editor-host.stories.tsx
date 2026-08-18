import type { Config, ItemEditorProps, ItemSeed } from '@burger-editor/core';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { ItemEditorHost, TextField } from '@burger-editor/client/ui';
import { Item } from '@burger-editor/core';
import { fn } from 'storybook/test';

import { createMockEngine } from '../mocks/create-mock-engine.js';

const sampleConfig: Config = {
	classList: [],
	googleMapsApiKey: null,
	sampleImagePath: 'https://example.com/sample.png',
	sampleFilePath: 'https://example.com/sample.pdf',
	stylesheets: [],
};

/**
 * `Item.seed.Editor` に渡すサンプル実装。実プロダクトの各アイテムは
 * ここが `TextField`/`WysiwygField` 等の組み合わせになる。
 * @param root0
 * @param root0.state
 * @param root0.setState
 */
function SampleEditor({ state, setState }: ItemEditorProps) {
	const text = typeof state['text'] === 'string' ? state['text'] : '';
	return (
		<TextField
			label="見出しテキスト"
			value={text}
			onChange={(value) => setState({ ...state, text: value })}
		/>
	);
}

const sampleSeed: ItemSeed = {
	version: '1',
	name: 'sample-text',
	template: '<div></div>',
	style: '',
	Editor: SampleEditor,
};

const itemSeeds = new Map<string, ItemSeed>([['sample-text', sampleSeed]]);

const meta = {
	title: 'Client/Components/ItemEditorHost',
	component: ItemEditorHost,
	// 自身がEditorDialog（<dialog>）を内包するため、既定のdialogラップは
	// 二重になってしまう
	parameters: { wrapper: 'none' },
} satisfies Meta<typeof ItemEditorHost>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Open: Story = {
	args: {
		engine: createMockEngine({
			config: sampleConfig,
			save: fn(),
			getContentStylesheet: () => Promise.resolve(''),
		}),
		item: Item.create('sample-text', itemSeeds, sampleConfig, {
			text: 'サンプルテキスト',
		}),
	},
};

export const Closed: Story = {
	args: {
		...Open.args,
		item: null,
	},
};
