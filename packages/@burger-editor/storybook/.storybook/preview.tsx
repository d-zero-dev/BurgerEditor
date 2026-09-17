import type { Preview } from '@storybook/react-vite';
import type { ReactNode } from 'react';

import { EngineProvider, RootErrorBoundary } from '@burger-editor/client/ui';
import { defineBgeWysiwygEditorElement } from '@burger-editor/custom-element';
import { Suspense, useState } from 'react';

import { createMockEngine } from '../src/mocks/create-mock-engine.js';

import '@burger-editor/client/style';
import '@burger-editor/local/style';

// <bge-wysiwyg-editor> はカスタムエレメントとしてグローバルに一度だけ
// 登録する必要がある（wysiwyg-field.stories.tsx が依存）
defineBgeWysiwygEditorElement();

/**
 * `ui.css` の大半のフォーム/ボタンスタイルは `:where(dialog[open],
 * [data-bge-component='block-menu'])` の子孫にのみ適用される設計
 * （実際のプロダクションでは、これらのコンポーネントは常にエディタの
 * ダイアログかブロックメニューの中でレンダリングされるため）。
 * Storybookで単体表示するとこの前提を満たさずスタイルが当たらないため、
 * 各storyの `parameters.wrapper` に応じて実際の親要素を再現する。
 * - 'dialog'（既定）: `EditorDialog` の `dialog.bge-dialog > div > form > div`
 * - 'block-menu': `[data-bge-component='block-menu']` を持つ要素
 * - 'none': ラップしない（編集エリア本体・ページ通常フロー等、
 *   dialog/block-menu の外で使われるコンポーネント）
 */
/**
 * 個々のstoryが`useEngine()`/`use()`を呼ぶコンポーネントを直接レンダー
 * しても`useEngine() must be called under an <EngineProvider>`で落ちない
 * よう、既定のengineを常に用意する。story固有のengineが必要な場合は
 * story側で内側に別の`<EngineProvider>`を重ねればそちらが優先される
 * （Reactのcontextは最も内側のProviderを解決するため）
 */
function DefaultEngineProvider({ children }: { readonly children: ReactNode }) {
	const [engine] = useState(() => createMockEngine());
	return <EngineProvider engine={engine}>{children}</EngineProvider>;
}

const preview: Preview = {
	decorators: [
		(Story, context) => {
			const wrapper = context.parameters['wrapper'] ?? 'dialog';
			const wrapped =
				wrapper === 'none' ? (
					<Story />
				) : wrapper === 'block-menu' ? (
					// BlockMenuView は position: absolute で自身を配置するため、
					// 基準となる position: relative を明示する
					<div data-bge-component="block-menu" style={{ position: 'relative' }}>
						<Story />
					</div>
				) : (
					<dialog open className="bge-dialog">
						<div>
							<form>
								<div>
									<Story />
								</div>
							</form>
						</div>
					</dialog>
				);
			return (
				<DefaultEngineProvider>
					<RootErrorBoundary>
						<Suspense fallback={<p>Loading…</p>}>{wrapped}</Suspense>
					</RootErrorBoundary>
				</DefaultEngineProvider>
			);
		},
	],
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i,
			},
		},
	},
};

export default preview;
