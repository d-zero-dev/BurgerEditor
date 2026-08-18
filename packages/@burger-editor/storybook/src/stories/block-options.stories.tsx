import type { Meta, StoryObj } from '@storybook/react-vite';

import { BlockOptions } from '@burger-editor/client/ui';

import { createMockBlock } from '../mocks/create-mock-block.js';
import { createMockEngine } from '../mocks/create-mock-engine.js';

const meta = {
	title: 'Client/Components/BlockOptions',
	component: BlockOptions,
} satisfies Meta<typeof BlockOptions>;

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
