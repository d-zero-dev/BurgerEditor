import type {
	BurgerEditorEngine,
	EditableAreaHost,
	EditableAreaType,
} from '@burger-editor/core';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { EditableAreaView, useCommand } from '@burger-editor/client/ui';
import { highlightElement } from '@burger-editor/core';
import { useId, useState } from 'react';
import { fn } from 'storybook/test';

import { createMockEngine } from '../mocks/create-mock-engine.js';

/**
 * iframe内にコンテンツを表示するシェル。`BlockMenu`（ホバーメニュー）
 * を内部で使うが、`BurgerBlock` の実インスタンスがない状態ではマウス
 * オーバーしてもメニューは表示されない（`getBlockAtPosition` が
 * `null` を返して自己回復するだけ、詳細は `BlockMenuView` の story を
 * 参照）。ここではiframeのコンテンツ表示・高さ追従の見た目確認に限る。
 */
const meta = {
	title: 'Client/Components/EditableAreaView',
	component: EditableAreaView,
	// 編集エリア本体（iframeシェル）のため、dialog/block-menuではラップしない
	parameters: { wrapper: 'none' },
} satisfies Meta<typeof EditableAreaView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Main: Story = {
	args: {
		engine: createMockEngine({ content: { type: 'main' } }),
		type: 'main',
		initialContent: '<p>サンプルコンテンツです。</p>',
		stylesheets: [],
		classList: [],
		onReady: fn(),
	},
};

/**
 * agent-hub（MCPサーバー経由のブロック操作）だけが呼ぶ
 * `BurgerBlock.highlight()` を手動発火して見た目を確認するための story。
 * `highlight()`自体は`highlightElement(this.el, options)`を呼ぶだけの
 * 薄いラッパーのため、実インスタンス生成なしにiframe内の対象要素へ
 * 直接`highlightElement`を適用することで同じ処理を再現している。
 *
 * `EditableAreaView`はコンテンツ描画をengine側（`content.replaceContents`）に
 * 委ねており、モックengineではその処理が走らないため`initialContent`が
 * 画面に現れない。ここでは`onReady`で受け取った`containerElement`に直接
 * 書き込んで代替している。
 * @param root0
 * @param root0.engine
 * @param root0.type
 * @param root0.initialContent
 * @param root0.stylesheets
 * @param root0.classList
 */
function AgentHighlightDemo({
	engine,
	type,
	initialContent,
	stylesheets,
	classList,
}: {
	readonly engine: BurgerEditorEngine;
	readonly type: EditableAreaType;
	readonly initialContent: string;
	readonly stylesheets: readonly { readonly path: string; readonly id: string }[];
	readonly classList: readonly string[];
}) {
	const [host, setHost] = useState<EditableAreaHost | null>(null);
	const targets = [...(host?.containerElement.querySelectorAll('p') ?? [])];
	const rootId = useId();
	const rootRef = useCommand<HTMLDivElement>({
		'--highlight-block': (e) => {
			const index = Number((e.source as HTMLButtonElement | null)?.value);
			const target = targets[index];
			if (target) {
				void highlightElement(target);
			}
		},
	});

	return (
		<div ref={rootRef} id={rootId}>
			<div style={{ display: 'flex', gap: '0.5em', marginBlockEnd: '1em' }}>
				{targets.map((el, i) => (
					<button
						key={`${i}-${el.textContent}`}
						type="button"
						command="--highlight-block"
						commandfor={rootId}
						value={i}>
						ブロック{i + 1}をhighlight()
					</button>
				))}
			</div>
			<EditableAreaView
				engine={engine}
				type={type}
				initialContent={initialContent}
				stylesheets={stylesheets}
				classList={classList}
				onReady={(readyHost) => {
					readyHost.containerElement.innerHTML = initialContent;
					setHost(readyHost);
				}}
			/>
		</div>
	);
}

export const AgentHighlight: Story = {
	args: {
		...Main.args,
		// min-block-sizeをvh指定にすると、コンテンツ実サイズにiframeの高さを
		// 追従させるResizeObserverと相互作用して高さが際限なく増え続ける
		// （高さ変化→vh基準の再計算→さらなる高さ変化…のフィードバックループ）
		// ため、固定pxで確保する
		initialContent: [
			'<p style="min-block-size: 600px;">ブロック1（スクロール確認用の余白つき）</p>',
			'<p style="min-block-size: 600px;">ブロック2（スクロール確認用の余白つき）</p>',
			'<p>ブロック3（画面外から呼ばれる想定）</p>',
		].join(''),
	},
	render: (args) => <AgentHighlightDemo {...args} />,
};

export const Empty: Story = {
	args: {
		...Main.args,
		engine: createMockEngine({ content: { type: 'main' } }),
		initialContent: '',
	},
};

export const Draft: Story = {
	args: {
		engine: createMockEngine({ content: { type: 'draft' }, hasDraft: () => true }),
		type: 'draft',
		initialContent: '<p>下書きのコンテンツです。</p>',
		stylesheets: [],
		classList: [],
		onReady: fn(),
	},
};
