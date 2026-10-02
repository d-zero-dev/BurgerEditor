import type { ImportData } from './definition.js';

import { createItem } from '@burger-editor/core';

import { importDefinition } from './definition.js';
import { ImportEditor } from './editor.js';

export default createItem<ImportData>({ ...importDefinition, Editor: ImportEditor });
