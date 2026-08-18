import type { Preview } from '@storybook/react-vite';

import { defineBgeWysiwygEditorElement } from '@burger-editor/custom-element';

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
const preview: Preview = {
	decorators: [
		(Story, context) => {
			const wrapper = context.parameters['wrapper'] ?? 'dialog';
			if (wrapper === 'none') {
				return <Story />;
			}
			if (wrapper === 'block-menu') {
				// BlockMenuView は position: absolute で自身を配置するため、
				// 基準となる position: relative を明示する
				return (
					<div data-bge-component="block-menu" style={{ position: 'relative' }}>
						<Story />
					</div>
				);
			}
			return (
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
