import { Node } from '@tiptap/core';

export const DescriptionList = Node.create({
	name: 'descriptionList',
	group: 'block',
	content: 'descriptionListTermGroup+',
	defining: true,
	parseHTML() {
		return [{ tag: 'dl' }];
	},
	renderHTML({ HTMLAttributes }) {
		return ['dl', HTMLAttributes, 0];
	},
});
