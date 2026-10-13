import type { DownloadFileData } from './definition.js';

import { createItem } from '@burger-editor/core';

import { downloadFileDefinition } from './definition.js';
import { DownloadFileEditor } from './editor.js';

export default createItem<DownloadFileData>({
	...downloadFileDefinition,
	Editor: DownloadFileEditor,
});
