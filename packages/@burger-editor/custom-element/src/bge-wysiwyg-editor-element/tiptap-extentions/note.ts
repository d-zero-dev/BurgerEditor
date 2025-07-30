import { Node } from '@tiptap/core';

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		note: {
			toggleNote: () => ReturnType;
		};
	}
}

export const Note = Node.create({
	name: 'note',
	group: 'block',
	content: 'paragraph block*',
	defining: true,
	priority: 100_000,
	parseHTML() {
		return [
			{
				tag: 'div[role="note"]',
				getAttrs: (node) => {
					return {
						role: node.getAttribute('role'),
					};
				},
			},
		];
	},
	renderHTML() {
		return ['div', { role: 'note' }, 0];
	},
	addCommands() {
		return {
			toggleNote:
				() =>
				({ commands }) => {
					return commands.toggleWrap(this.name);
				},
		};
	},
});
