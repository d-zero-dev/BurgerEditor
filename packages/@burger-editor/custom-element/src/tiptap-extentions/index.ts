import { Extension } from '@tiptap/core';

import { ButtonLikeLink } from './button-like-link.js';
import { DescriptionListDetail } from './description-list-detail.js';
import { DescriptionListTermGroup } from './description-list-term-group.js';
import { DescriptionListTerm } from './description-list-term.js';
import { DescriptionList } from './description-list.js';
import { FlexBox } from './flex-box.js';
import { GeneralBlock } from './general-block.js';
import { Image } from './image.js';
import { Note } from './note.js';
import { TableBody } from './table-body.js';
import { TableCaption } from './table-caption.js';
import { TableCell } from './table-cell.js';
import { TableFoot } from './table-foot.js';
import { TableHead } from './table-head.js';
import { TableHeader } from './table-header.js';
import { TableRow } from './table-row.js';
import { Table } from './table.js';

export const BgeWysiwygEditorKit = Extension.create({
	name: 'bge-wysiwyg-editor-kit',
	addExtensions() {
		return [
			Image,
			FlexBox,
			DescriptionList,
			DescriptionListTermGroup,
			DescriptionListTerm,
			DescriptionListDetail,
			Note,
			ButtonLikeLink,
			GeneralBlock,
			Table,
			TableCaption,
			TableHead,
			TableFoot,
			TableBody,
			TableHeader,
			TableRow,
			TableCell,
		];
	},
});
