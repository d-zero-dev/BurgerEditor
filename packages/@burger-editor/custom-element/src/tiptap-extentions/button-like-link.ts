import { Node, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		buttonLikeLink: {
			toggleButtonLikeLink: (attributes?: { href: string }) => ReturnType;
		};
	}
}

export const ButtonLikeLink = Node.create({
	name: 'buttonLikeLink',
	group: 'block',
	content: 'paragraph+',
	defining: true,
	addAttributes() {
		return {
			'data-bgc-style': { default: 'button' },
			href: { default: '' },
		};
	},
	parseHTML() {
		return [
			{
				tag: 'div[data-bgc-style="button"]:has(> a[href] > div)',
				getAttrs: (node) => {
					return {
						href: node.querySelector('a')?.getAttribute('href'),
					};
				},
				contentElement(node) {
					return node.querySelector('a[href] > div') ?? node;
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
				['div', {}, 0],
			],
		];
	},
	addCommands() {
		return {
			toggleButtonLikeLink:
				(attributes) =>
				({ state, chain }) => {
					const { from } = state.selection;
					const $from = state.doc.resolve(from);

					// Allow unwrap if current node is button-like-link
					if ($from.parent.type === this.type) {
						return chain().toggleNode(this.name, 'paragraph', attributes).run();
					}

					// Check if link elements are contained when trying to wrap paragraph with button-like-link
					let hasLinkElement = false;

					// Check all content within the current paragraph node
					$from.parent.content.descendants((node): boolean | void => {
						if (node.marks && node.marks.some((mark) => mark.type.name === 'link')) {
							hasLinkElement = true;
							return false; // Early termination
						}
					});

					// Do not wrap if link elements are contained
					if (hasLinkElement) {
						return false;
					}

					return chain().toggleWrap(this.name, attributes).run();
				},
		};
	},
});
