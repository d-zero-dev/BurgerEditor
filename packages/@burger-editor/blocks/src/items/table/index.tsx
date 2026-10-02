import type { TableData } from './definition.js';

import { createItem } from '@burger-editor/core';

import { tableDefinition } from './definition.js';
import { TableItemEditor } from './editor.js';

export default createItem<TableData>({ ...tableDefinition, Editor: TableItemEditor });
