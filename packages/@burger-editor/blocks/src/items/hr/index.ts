import { createItem } from '../../create-item.js';

import editor from './editor.html';
import style from './style.css';
import template from './template.html';

export default createItem<{
	/**
	 * :WARNING: Use `kind` instead of `type`.
	 * @deprecated dropped in 2.12.0
	 */
	type?: string;

	/**
	 * @since 2.12.0
	 */
	kind: string;
}>({
	version: __VERSION__,
	name: 'hr',
	template,
	style,
	editor,
	editorOptions: {
		migrate(type) {
			const data = type.export();
			if (data.type) {
				data.kind = data.type.replace(/^bgi-hr--/, '');
				delete data.type;
			}
			if (!data.kind) {
				data.kind = 'primary';
			}
			return data;
		},
	},
});
