import type {
	BurgerEditorEngine,
	Config,
	ItemEditorProps,
	ItemSeed,
} from '@burger-editor/core';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { EngineProvider, ItemEditorHost, TextField } from '@burger-editor/client/ui';
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

/**
 * `ItemEditorHost` reads the engine via `useEngine()`; this story-only
 * wrapper keeps the `{engine, item}` args shape the stories below use.
 * @param root0
 * @param root0.engine
 * @param root0.item
 */
function ItemEditorHostStory({
	engine,
	item,
}: {
	readonly engine: BurgerEditorEngine;
	readonly item: Parameters<typeof ItemEditorHost>[0]['item'];
}) {
	return (
		<EngineProvider engine={engine}>
			<ItemEditorHost item={item} />
		</EngineProvider>
	);
}

const meta = {
	title: 'Client/Components/ItemEditorHost',
	component: ItemEditorHostStory,
	// 自身がEditorDialog（<dialog>）を内包するため、既定のdialogラップは
	// 二重になってしまう
	parameters: { wrapper: 'none' },
} satisfies Meta<typeof ItemEditorHostStory>;

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
