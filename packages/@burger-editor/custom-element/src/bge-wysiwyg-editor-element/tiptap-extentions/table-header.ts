import type { TableHeaderOptions } from '@tiptap/extension-table';

import { TableHeader as OriginalTableHeader } from '@tiptap/extension-table';

export const TableHeader = OriginalTableHeader.extend<TableHeaderOptions>({
	renderHTML() {
		return ['th', {}, 0];
	},
});
