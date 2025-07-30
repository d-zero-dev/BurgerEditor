import { Node } from '@tiptap/core';

export const DescriptionListTermGroup = Node.create({
	name: 'descriptionListTermGroup',
	content: 'descriptionListTerm descriptionListDetail',
	priority: 10,
	parseHTML() {
		return [{ tag: 'div:is(dl > *)' }];
	},
	renderHTML({ HTMLAttributes }) {
		return ['div', HTMLAttributes, 0];
	},
});
