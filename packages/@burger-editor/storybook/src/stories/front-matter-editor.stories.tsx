import type { Meta, StoryObj } from '@storybook/react-vite';

import { FrontMatterEditorView, FrontMatterStore } from '@burger-editor/client/ui';
import { useState } from 'react';
import { expect, within } from 'storybook/test';

/**
 * `FrontMatterEditorView` reads its fields from a `FrontMatterStore`
 * instead of an `initialData`/`onDataChange` prop pair; this story-only
 * wrapper keeps the `{initialData}` args shape the stories below use.
 * @param root0
 * @param root0.initialData
 */
function FrontMatterEditorStory({
	initialData,
}: {
	readonly initialData: Record<string, unknown>;
}) {
	const [store] = useState(() => new FrontMatterStore(initialData));
	return <FrontMatterEditorView store={store} />;
}

const meta = {
	title: 'Client/Components/FrontMatterEditor',
	component: FrontMatterEditorStory,
	// localのページ本文（app.tsx）に直接配置され、独自CSS
	// （local/style/app.cssの.fm-editor*）で完結するためラップしない
	parameters: { wrapper: 'none' },
} satisfies Meta<typeof FrontMatterEditorStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		initialData: {
			title: 'ページタイトル',
			description: 'ページの説明文です。',
			publishedAt: '2026-08-01',
		},
	},
};

export const Empty: Story = {
	args: {
		initialData: {},
	},
};

export const Collapsed: Story = {
	args: {
		initialData: {
			title: 'ページタイトル',
		},
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const summary = canvas.getByText('Front Matter');
		// summary の開閉は UA の click で、Invoker Command ではない。
		// click() は ESLint が禁止しているので、同じイベントを送る
		summary.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
		await expect(canvas.getByText('title')).not.toBeVisible();
	},
};

export const MixedFieldTypes: Story = {
	args: {
		initialData: {
			title: 'ページタイトル',
			viewCount: 128,
			isPublished: true,
			publishedAt: '2026-08-01',
			tags: ['news', 'release'],
		},
	},
};
