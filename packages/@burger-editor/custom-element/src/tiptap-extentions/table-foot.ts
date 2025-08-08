import { Node } from '@tiptap/core';

export const TableFoot = Node.create({
	name: 'tableFoot',
	content: 'tableRow+',
	parseHTML() {
		return [
			{
				tag: 'tfoot',
			},
		];
	},
	renderHTML() {
		return ['tfoot', {}, 0];
	},
});
