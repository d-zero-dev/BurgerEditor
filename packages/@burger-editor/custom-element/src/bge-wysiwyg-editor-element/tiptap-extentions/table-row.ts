import type { TableRowOptions } from '@tiptap/extension-table';

import { TableRow as OriginalTableRow } from '@tiptap/extension-table';

export const TableRow = OriginalTableRow.extend<TableRowOptions>({
	renderHTML({ HTMLAttributes }) {
		return ['tr', HTMLAttributes, 0];
	},
});
