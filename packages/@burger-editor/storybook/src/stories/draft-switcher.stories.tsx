import type { BurgerEditorEngine } from '@burger-editor/core';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { DraftSwitcher, EngineProvider } from '@burger-editor/client/ui';

import { createMockEngine } from '../mocks/create-mock-engine.js';

/**
 * `DraftSwitcher` reads the engine via `useEngine()`; this story-only
 * wrapper keeps the `{engine}` args shape the stories below use.
 * @param root0
 * @param root0.engine
 */
function DraftSwitcherStory({ engine }: { readonly engine: BurgerEditorEngine }) {
	return (
		<EngineProvider engine={engine}>
			<DraftSwitcher />
		</EngineProvider>
	);
}

const meta = {
	title: 'Client/Components/DraftSwitcher',
	component: DraftSwitcherStory,
	// エディタ本体の外側（編集エリアの直前）に配置されるUIのため、
	// dialog/block-menuではラップしない
	parameters: { wrapper: 'none' },
} satisfies Meta<typeof DraftSwitcherStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Main: Story = {
	args: {
		engine: createMockEngine({
			content: { type: 'main' },
			hasDraft: () => true,
		}),
	},
};

export const Draft: Story = {
	args: {
		engine: createMockEngine({
			content: { type: 'draft' },
			hasDraft: () => true,
		}),
	},
};
