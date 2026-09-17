import type { BurgerEditorEngine, BurgerBlock } from '@burger-editor/core';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { BlockOptions, EngineProvider } from '@burger-editor/client/ui';

import { createMockBlock } from '../mocks/create-mock-block.js';
import { createMockEngine } from '../mocks/create-mock-engine.js';

/**
 * `BlockOptions` reads the engine via `useEngine()`; this story-only
 * wrapper keeps the `{engine, block}` args shape the stories below use.
 * @param root0
 * @param root0.engine
 * @param root0.block
 */
function BlockOptionsStory({
	engine,
	block,
}: {
	readonly engine: BurgerEditorEngine;
	readonly block: BurgerBlock;
}) {
	return (
		<EngineProvider engine={engine}>
			<BlockOptions block={block} />
		</EngineProvider>
	);
}

const meta = {
	title: 'Client/Components/BlockOptions',
	component: BlockOptionsStory,
} satisfies Meta<typeof BlockOptionsStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Grid: Story = {
	args: {
		engine: createMockEngine(),
		block: createMockBlock({ items: [{}, {}, {}] }),
	},
};

export const GridWithStyleVariants: Story = {
	args: {
		engine: createMockEngine({
			getCustomProperties: () =>
				new Map([
					[
						'color',
						{
							id: 'color',
							name: '文字色',
							properties: new Map([
								[
									'--text-color-primary',
									{ value: '#1a1a1a', priority: [1], isDefault: true },
								],
								[
									'--text-color-accent',
									{ value: '#d0021b', priority: [2], isDefault: false },
								],
							]),
						},
					],
				]),
		}),
		block: createMockBlock({ items: [{}, {}] }),
	},
};

export const Inline: Story = {
	args: {
		engine: createMockEngine(),
		block: createMockBlock({
			exportOptions: () => ({
				containerProps: {
					type: 'inline',
					columns: null,
					frameSemantics: 'div',
					autoRepeat: 'fixed',
					justify: 'center',
					align: null,
					float: null,
					linkarea: false,
					immutable: false,
					repeatMinInlineSize: null,
				},
				classList: [],
				id: null,
				style: {},
			}),
			items: [{}, {}, {}],
		}),
	},
};

export const Float: Story = {
	args: {
		engine: createMockEngine(),
		block: createMockBlock({
			exportOptions: () => ({
				containerProps: {
					type: 'float',
					columns: null,
					frameSemantics: 'div',
					autoRepeat: 'fixed',
					justify: null,
					align: null,
					float: 'start',
					linkarea: false,
					immutable: true,
					repeatMinInlineSize: null,
				},
				classList: [],
				id: null,
				style: {},
			}),
			items: [{}],
		}),
	},
};

export const WithRepeatMinInlineSizeVariants: Story = {
	args: {
		engine: createMockEngine({
			getRepeatMinInlineSizeVariants: () => ({
				id: 'repeat-min-inline-size',
				name: '折り返し基準幅',
				properties: new Map([
					['--min-16em', { value: '16em', priority: [1], isDefault: true }],
					['--min-20em', { value: '20em', priority: [2], isDefault: false }],
				]),
			}),
		}),
		block: createMockBlock({
			exportOptions: () => ({
				containerProps: {
					type: 'grid',
					columns: null,
					frameSemantics: 'div',
					autoRepeat: 'auto-fill',
					justify: null,
					align: null,
					float: null,
					linkarea: false,
					immutable: false,
					repeatMinInlineSize: null,
				},
				classList: [],
				id: null,
				style: {},
			}),
			items: [{}, {}, {}, {}],
		}),
	},
};
