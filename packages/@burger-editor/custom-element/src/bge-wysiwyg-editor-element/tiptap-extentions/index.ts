import { Extension } from '@tiptap/core';

import { ButtonLikeLink } from './button-like-link.js';
import { DescriptionListDetail } from './description-list-detail.js';
import { DescriptionListTermGroup } from './description-list-term-group.js';
import { DescriptionListTerm } from './description-list-term.js';
import { DescriptionList } from './description-list.js';
import { GeneralBlock } from './general-block.js';
import { Note } from './note.js';

export const BgeWysiwygEditorKit = Extension.create({
	name: 'bge-wysiwyg-editor-kit',
	addExtensions() {
		return [
			DescriptionList,
			DescriptionListTermGroup,
			DescriptionListTerm,
			DescriptionListDetail,
			Note,
			ButtonLikeLink,
			GeneralBlock,
		];
	},
});
