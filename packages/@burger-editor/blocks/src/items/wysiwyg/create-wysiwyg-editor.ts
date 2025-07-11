import type { WysiwygData } from './index.js';
import type { ItemEditorDialog } from '@burger-editor/core';

import { registerDragonSupport } from '@lexical/dragon';
import { createEmptyHistoryState, registerHistory } from '@lexical/history';
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import { LinkNode } from '@lexical/link';
import { ListNode, ListItemNode } from '@lexical/list';
import { HeadingNode, QuoteNode, registerRichText } from '@lexical/rich-text';
import { TableNode, TableCellNode, TableRowNode } from '@lexical/table';
import { mergeRegister } from '@lexical/utils';
import { $getRoot, $insertNodes, createEditor } from 'lexical';

import { registerToolButtonLink } from './register-tool-button-link.js';
import { registerToolButton } from './register-tool-button.js';

/**
 *
 * @param $editorArea
 * @param dialog
 * @param initialHTML
 */
export function createWysiwygEditor(
	$editorArea: HTMLDivElement,
	dialog: ItemEditorDialog<WysiwygData>,
	initialHTML: string,
) {
	$editorArea.contentEditable = 'true';

	const lexicalEditor = createEditor({
		namespace: 'bge-wysiwyg',
		nodes: [
			HeadingNode,
			LinkNode,
			ListItemNode,
			ListNode,
			QuoteNode,
			TableCellNode,
			TableNode,
			TableRowNode,
		],
		onError: (error: Error) => {
			throw error;
		},
	});

	lexicalEditor.setRootElement($editorArea);

	lexicalEditor.update(() => {
		const parser = new DOMParser();
		const dom = parser.parseFromString(initialHTML, 'text/html');
		const nodes = $generateNodesFromDOM(lexicalEditor, dom);
		$getRoot().select();
		$insertNodes(nodes);
	});

	// Registering Plugins
	mergeRegister(
		registerRichText(lexicalEditor),
		registerDragonSupport(lexicalEditor),
		registerHistory(lexicalEditor, createEmptyHistoryState(), 300),
	);

	lexicalEditor.registerUpdateListener(({ editorState }) => {
		editorState.read(() => {
			const html = $generateHtmlFromNodes(lexicalEditor);
			const parser = new DOMParser();
			const dom = parser.parseFromString(html, 'text/html');
			const dirs = dom.body.querySelectorAll('[dir]');
			for (const dir of dirs) {
				dir.removeAttribute('dir');
			}
			while (true) {
				const span = dom.body.querySelector('span[style]');
				if (!span) {
					break;
				}
				const children = span.childNodes;
				span.after(...children);
				span.remove();
			}
			const whitespacePrewrapStyles = dom.body.querySelectorAll(
				'[style*="white-space: pre-wrap"]',
			);
			for (const whitespacePrewrapStyle of whitespacePrewrapStyles) {
				whitespacePrewrapStyle.removeAttribute('style');
			}
			const htmlString = dom.body.innerHTML;
			dialog.update('$wysiwyg', htmlString);
		});
	});

	registerToolButton(lexicalEditor, dialog, 'bold');
	registerToolButton(lexicalEditor, dialog, 'italic');
	// registerToolButton(lexicalEditor, dialog, 'superscript');
	// registerToolButton(lexicalEditor, dialog, 'underline');
	// registerToolButton(lexicalEditor, dialog, 'strikethrough');
	registerToolButton(lexicalEditor, dialog, 'code');
	registerToolButtonLink(
		lexicalEditor,
		dialog.find<HTMLButtonElement>('[data-bge-toolbar-button="link"]'),
	);
}
