import { Node } from '@tiptap/core';

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		flexBox: {
			toggleFlexBox: (attributes?: {
				justifyContent: FlexBoxJustifyContent;
			}) => ReturnType;
		};
	}
}

export type FlexBoxJustifyContent =
	| 'start'
	| 'end'
	| 'center'
	| 'between'
	| 'around'
	| 'evenly';

export const FlexBox = Node.create({
	name: 'flexBox',
	group: 'block',
	/**
	 * Blocks are defined statically.
	 * We can define `content: () => {}`, but `this.editor.schema` is undefined at that point.
	 *
	 * `block+` is not used due to exclude self.
	 */
	content: `(${[
		'paragraph',
		'generalBlock',
		'blockquote',
		'codeBlock',
		'bulletList',
		'orderedList',
		'table',
		'note',
		'descriptionList',
		'buttonLikeLink',
	].join('|')})+`,
	defining: true,
	addAttributes() {
		return {
			'data-bgc-flex-box': {
				default: 'start',
				parseHTML(node) {
					return node.dataset.bgcFlexBox;
				},
			},
		};
	},
	parseHTML() {
		return [
			{
				tag: 'div[data-bgc-flex-box]',
				getAttrs: (node) => {
					return {
						'data-bgc-flex-box': node.dataset.bgcFlexBox,
					};
				},
			},
		];
	},
	renderHTML({ HTMLAttributes }) {
		return [
			'div',
			{
				'data-bgc-flex-box': HTMLAttributes['data-bgc-flex-box'],
			},
			0,
		];
	},
	addCommands() {
		return {
			toggleFlexBox:
				(attributes) =>
				({ commands, chain, state }) => {
					const { selection } = state;
					const { $from } = selection;

					// Check if current selection is already in a flexBox
					let flexBoxDepth = 0;
					for (let depth = $from.depth; depth > 0; depth--) {
						const node = $from.node(depth);
						if (node.type.name === this.name) {
							flexBoxDepth = depth;
							break;
						}
					}

					if (flexBoxDepth > 0) {
						// Get the first child position before unwrapping
						const firstChildStart = $from.start(flexBoxDepth) + 1; // +1 to get inside first child

						// Select the entire flexBox and then unwrap
						const flexBoxStart = $from.start(flexBoxDepth);
						const flexBoxEnd = $from.end(flexBoxDepth);

						return chain()
							.setTextSelection({ from: flexBoxStart, to: flexBoxEnd })
							.lift(this.name)
							.setTextSelection({ from: firstChildStart, to: firstChildStart })
							.run();
					}

					// Wrap: wrap selection in flexBox or insert new flexBox
					if (!selection.empty) {
						return commands.wrapIn(this.name, attributes);
					}
					return commands.insertContent({
						type: this.name,
						attrs: attributes,
						content: [
							{
								type: 'paragraph',
								content: [],
							},
						],
					});
				},
		};
	},
});
