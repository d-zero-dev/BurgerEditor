import type { ImageOptions } from '@tiptap/extension-image';

import { Image as OriginalImage } from '@tiptap/extension-image';

export const Image = OriginalImage.extend<ImageOptions>({
	renderHTML({ HTMLAttributes }) {
		return ['img', HTMLAttributes];
	},
});
