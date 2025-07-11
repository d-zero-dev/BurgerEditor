import { createItem } from '../../create-item.js';

import { createWysiwygEditor } from './create-wysiwyg-editor.js';
import editor from './editor.html';
import style from './style.css';
import template from './template.html';

export type WysiwygData = {
	wysiwyg: string;
};

export default createItem<WysiwygData>({
	version: __VERSION__,
	name: 'wysiwyg',
	template,
	style,
	editor,
	editorOptions: {
		async open(data, editor) {
			const PREVIEW_AREA_SELECTOR = '[data-bge-preview]';
			const EDITOR_AREA_SELECTOR = '[data-bgi="wysiwyg"]';
			const $editorArea = editor.find<HTMLDivElement>(EDITOR_AREA_SELECTOR);
			if (!$editorArea) {
				throw new Error(`Not found: "${EDITOR_AREA_SELECTOR}"`);
			}

			createWysiwygEditor($editorArea, editor, data.wysiwyg);

			const style = document.createElement('style');

			const css = await Promise.all(
				editor.engine.css.stylesheets
					.filter((sheet) => sheet.layer == null)
					.map(async (sheet) => {
						const res = await fetch(sheet.path);
						return res.text();
					}),
			);

			style.textContent = `
				@scope (${PREVIEW_AREA_SELECTOR}) {
					${css.join('\n')}
				}

				textarea[name="bge-wysiwyg"],
				${PREVIEW_AREA_SELECTOR} ${EDITOR_AREA_SELECTOR} {
					padding: 1em;
					block-size: 50svh;
					inline-size: 100%;
					resize: vertical;
					overflow-y: auto;
				}

				textarea[name="bge-wysiwyg"] {
					font-family: var(--bge-font-family-monospace);
				}

				[data-bge-mode="wysiwyg"] textarea[name="bge-wysiwyg"] {
					display: none;
				}

				[data-bge-mode="html"] [data-bge-preview] {
					display: none;
				}`;
			editor.el.before(style);

			const htmlModeButton = editor.find<HTMLButtonElement>(
				'[data-bge-toolbar-button="html-mode"]',
			)!;
			htmlModeButton.addEventListener('click', () => {
				htmlModeButton.ariaPressed =
					htmlModeButton.ariaPressed === 'true' ? 'false' : 'true';
				const mode = htmlModeButton.ariaPressed === 'true' ? 'html' : 'wysiwyg';
				editor
					.find<HTMLDivElement>(`[data-bge-mode]`)
					?.setAttribute('data-bge-mode', mode);
			});
		},
	},
});
