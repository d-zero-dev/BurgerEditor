import { Node } from '@tiptap/core';

export const DescriptionListDetail = Node.create({
	name: 'descriptionListDetail',
	content: 'paragraph block*',
	parseHTML() {
		return [{ tag: 'dd' }];
	},
	renderHTML({ HTMLAttributes }) {
		return ['dd', HTMLAttributes, 0];
	},
});
