import type { Preview } from '@storybook/react-vite';

import { defineBgeWysiwygEditorElement } from '@burger-editor/custom-element';

import '@burger-editor/client/style';
import '@burger-editor/local/style';

// <bge-wysiwyg-editor> はカスタムエレメントとしてグローバルに一度だけ
// 登録する必要がある（wysiwyg-field.stories.tsx が依存）
defineBgeWysiwygEditorElement();

const preview: Preview = {
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
