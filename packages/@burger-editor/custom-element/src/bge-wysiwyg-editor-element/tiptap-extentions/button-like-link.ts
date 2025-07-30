import { Node, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		buttonLikeLink: {
			toggleButtonLikeLink: (attributes?: { href: string }) => ReturnType;
			unsetButtonLikeLink: () => ReturnType;
		};
	}
}

export const ButtonLikeLink = Node.create({
	name: 'buttonLikeLink',
	group: 'block',
	content: 'inline*',
	defining: true,
	isolating: true,
	addAttributes() {
		return {
			class: { default: 'button-like-link' },
			href: { default: '' },
		};
	},
	parseHTML() {
		return [
			{
				tag: 'div.button-like-link:has(> a[href] > span)',
				getAttrs: (node) => {
					return {
						href: node.querySelector('a')?.getAttribute('href'),
					};
				},
				contentElement(node) {
					return node.querySelector('span') ?? node;
				},
			},
		];
	},
	renderHTML({ HTMLAttributes }) {
		return [
			'div',
			mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { href: null }),
			[
				'a',
				{
					href: HTMLAttributes.href,
				},
				['span', {}, 0],
			],
		];
	},
	addCommands() {
		return {
			toggleButtonLikeLink:
				(attributes) =>
				({ chain }) => {
					return chain().toggleNode(this.name, 'paragraph', attributes).run();
				},
			unsetButtonLikeLink:
				() =>
				({ chain }) => {
					return chain().wrapIn(this.name).run();
				},
		};
	},
});
