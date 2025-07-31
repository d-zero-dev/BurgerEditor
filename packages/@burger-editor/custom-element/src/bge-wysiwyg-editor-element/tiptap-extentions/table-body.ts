import { Node } from '@tiptap/core';

export const TableBody = Node.create({
	name: 'tableBody',
	content: 'tableRow+',
	parseHTML() {
		return [
			{
				tag: 'tbody',
			},
		];
	},
	renderHTML() {
		return ['tbody', {}, 0];
	},
});
