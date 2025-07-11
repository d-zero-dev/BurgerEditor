import type { LexicalEditor, RangeSelection } from 'lexical';

import { $isLinkNode, TOGGLE_LINK_COMMAND, toggleLink } from '@lexical/link';
import { $isAtNodeEnd } from '@lexical/selection';
import { $getSelection, $isRangeSelection, COMMAND_PRIORITY_LOW } from 'lexical';

/**
 *
 * @param editor
 * @param button
 */
export function registerToolButtonLink(
	editor: LexicalEditor,
	button: HTMLButtonElement | null,
) {
	editor.registerCommand(
		TOGGLE_LINK_COMMAND,
		(url) => {
			if (url == null) {
				return false;
			}
			const selection = $getSelection();
			if (!$isRangeSelection(selection)) {
				return false;
			}
			const node = getSelectedNode(selection);
			const parent = node.getParent();
			if ($isLinkNode(parent) || $isLinkNode(node)) {
				toggleLink(null);
			} else {
				if (typeof url === 'string') {
					toggleLink(url, { rel: null });
				} else {
					toggleLink(url.url, {
						rel: null,
						...url,
					});
				}
			}
			return true;
		},
		COMMAND_PRIORITY_LOW,
	);

	button?.addEventListener('click', () => {
		const url = prompt('Enter the URL', 'https://');
		if (!url?.trim()) {
			return;
		}
		editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
	});
}

/**
 *
 * @param selection
 */
function getSelectedNode(selection: RangeSelection) {
	const anchor = selection.anchor;
	const focus = selection.focus;
	const anchorNode = selection.anchor.getNode();
	const focusNode = selection.focus.getNode();
	if (anchorNode === focusNode) {
		return anchorNode;
	}
	const isBackward = selection.isBackward();
	if (isBackward) {
		return $isAtNodeEnd(focus) ? anchorNode : focusNode;
	} else {
		return $isAtNodeEnd(anchor) ? focusNode : anchorNode;
	}
}
