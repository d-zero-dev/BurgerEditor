import { Node } from '@tiptap/core';

export const DescriptionListTerm = Node.create({
	name: 'descriptionListTerm',
	content: 'inline*',
	parseHTML() {
		return [{ tag: 'dt' }];
	},
	renderHTML({ HTMLAttributes }) {
		return ['dt', HTMLAttributes, 0];
	},
});
