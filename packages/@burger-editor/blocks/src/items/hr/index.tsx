import type { HrData } from './definition.js';

import { createItem } from '@burger-editor/core';

import { hrDefinition } from './definition.js';
import { HrEditor } from './editor.js';

export default createItem<HrData>({ ...hrDefinition, Editor: HrEditor });
