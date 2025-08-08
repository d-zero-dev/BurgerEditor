import type { TableCellOptions } from '@tiptap/extension-table';

import { TableCell as OriginalTableCell } from '@tiptap/extension-table';

export const TableCell = OriginalTableCell.extend<TableCellOptions>({
	renderHTML() {
		return ['td', {}, 0];
	},
});
