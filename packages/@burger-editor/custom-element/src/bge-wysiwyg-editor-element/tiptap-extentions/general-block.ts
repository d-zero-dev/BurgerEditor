import { Node } from '@tiptap/core';

export const GeneralBlock = Node.create({
	name: 'general-block',
	group: 'block',
	content: 'block*',
	defining: true,
	addAttributes() {
		return {
			class: {
				parseHTML(node) {
					return node.getAttribute('class');
				},
			},
		};
	},
	parseHTML() {
		return [
			{
				tag: 'div:not(dl > *)',
				getAttrs: (node) => {
					return {
						class: node.getAttribute('class'),
					};
				},
			},
		];
	},
	renderHTML({ HTMLAttributes }) {
		return ['div', HTMLAttributes, 0];
	},
});
