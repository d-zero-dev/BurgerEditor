import type { TableOptions } from '@tiptap/extension-table';

import { Table as OriginalTable } from '@tiptap/extension-table';

export const Table = OriginalTable.extend<TableOptions>({
	content: 'tableCaption? tableHead? tableBody tableFoot?',
	renderHTML({ HTMLAttributes }) {
		return ['table', HTMLAttributes, 0];
	},
});
