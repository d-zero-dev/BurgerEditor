import { Node } from '@tiptap/core';

export const DescriptionListTermGroup = Node.create({
	name: 'descriptionListTermGroup',
	content: 'descriptionListTerm descriptionListDetail',
	parseHTML() {
		return [{ tag: 'div:is(dl > *)' }];
	},
	renderHTML({ HTMLAttributes }) {
		return ['div', HTMLAttributes, 0];
	},
});
