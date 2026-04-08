import { Node } from '@tiptap/core';

export const TableHead = Node.create({
	name: 'tableHead',
	content: 'tableRow+',
	parseHTML() {
		return [
			{
				tag: 'thead',
			},
		];
	},
	renderHTML() {
		return ['thead', {}, 0];
	},
});
