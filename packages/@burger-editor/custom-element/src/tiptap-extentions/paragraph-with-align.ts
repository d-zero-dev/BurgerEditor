import Paragraph from '@tiptap/extension-paragraph';

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		paragraphWithAlign: {
			setAlign: (alignment: ParagraphAlignment) => ReturnType;
			unsetAlign: () => ReturnType;
			toggleAlign: (alignment: ParagraphAlignment) => ReturnType;
		};
	}
}

export type ParagraphAlignment = 'start' | 'center' | 'end';

export const ParagraphWithAlign = Paragraph.extend({
	name: 'paragraph',

	addAttributes() {
		return {
			...this.parent?.(),
			'data-bgc-align': {
				default: null,
				parseHTML: (element) => {
					const align = element.dataset.bgcAlign;
					// バリデーション: 不正な値はnullを返す
					if (align && ['start', 'center', 'end'].includes(align)) {
						return align;
					}
					return null;
				},
				renderHTML: (attributes) => {
					if (!attributes['data-bgc-align']) {
						return {};
					}
					return {
						'data-bgc-align': attributes['data-bgc-align'],
					};
				},
			},
		};
	},

	addCommands() {
		return {
			setAlign:
				(alignment: ParagraphAlignment) =>
				({ commands }) => {
					return commands.updateAttributes('paragraph', {
						'data-bgc-align': alignment,
					});
				},
			unsetAlign:
				() =>
				({ commands }) => {
					return commands.resetAttributes('paragraph', 'data-bgc-align');
				},
			toggleAlign:
				(alignment: ParagraphAlignment) =>
				({ commands, editor }) => {
					// 現在のalignmentが指定されたものと同じならunset、異なればset
					if (editor.isActive('paragraph', { 'data-bgc-align': alignment })) {
						return commands.unsetAlign();
					}
					return commands.setAlign(alignment);
				},
		};
	},
});
