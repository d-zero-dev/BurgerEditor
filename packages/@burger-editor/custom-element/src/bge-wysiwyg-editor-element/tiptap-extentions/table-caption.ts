import { Node } from '@tiptap/core';

export const TableCaption = Node.create({
	name: 'tableCaption',
	content: 'text*',
	parseHTML() {
		return [
			{
				tag: 'caption',
			},
		];
	},
	renderHTML() {
		return ['caption', {}, 0];
	},
});
