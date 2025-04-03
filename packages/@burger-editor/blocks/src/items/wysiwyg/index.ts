// @ts-ignore
import Trix from 'trix';

import { createItem } from '../../create-item.js';

import editor from './editor.html';
import style from './style.css';
import template from './template.html';

export default createItem<{
	wysiwyg: string;
}>({
	version: __VERSION__,
	name: 'wysiwyg',
	template,
	style,
	editor,
	editorOptions: {
		async open(data, editor) {
			const EDITOR_AREA_SELECTOR = '[data-bgi-input="wysiwyg"]';
			const $editorArea = editor.find<HTMLDivElement>(EDITOR_AREA_SELECTOR);
			if (!$editorArea) {
				throw new Error(`Not found: "${EDITOR_AREA_SELECTOR}"`);
			}

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const $editor: HTMLDivElement & { editor: any } =
				new Trix.elements.TrixEditorElement();
			$editorArea.append($editor);

			$editor.editor.insertHTML(data.wysiwyg);

			$editor.addEventListener('trix-change', () => {
				editor.update('$wysiwyg', $editor.innerHTML);
			});

			$editor.classList.add(...editor.engine.css.classList);
			$editor.style.setProperty('padding', '1em', 'important');
			$editor.style.setProperty('inline-size', '100%', 'important');

			const style = document.createElement('style');

			$editor.hidden = true;

			const main = await Promise.all(
				editor.engine.css.stylesheets
					.filter((url) => url !== '/client.css')
					.map(async (url) => {
						const res = await fetch(url);
						return res.text();
					}),
			);

			style.textContent = `
				@scope (${EDITOR_AREA_SELECTOR}) {
					${main.join('\n')}

					[data-trix-button-group="file-tools"] {
						display: none !important;
					}
				}`;
			$editorArea.before(style);

			$editor.hidden = false;
		},
	},
});
