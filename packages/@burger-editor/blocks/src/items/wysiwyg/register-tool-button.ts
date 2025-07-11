import type { WysiwygData } from './index.js';
import type { ItemEditorDialog } from '@burger-editor/core';
import type { LexicalEditor, TextFormatType } from 'lexical';

import { FORMAT_TEXT_COMMAND } from 'lexical';

/**
 *
 * @param editor
 * @param dialog
 * @param type
 */
export function registerToolButton(
	editor: LexicalEditor,
	dialog: ItemEditorDialog<WysiwygData>,
	type: TextFormatType,
) {
	dialog
		.find<HTMLButtonElement>(`[data-bge-toolbar-button="${type}"]`)
		?.addEventListener('click', () => {
			editor.dispatchCommand(FORMAT_TEXT_COMMAND, type);
		});
}
