import type { WysiwygData } from './definition.js';

import { createItem } from '@burger-editor/core';

import { wysiwygDefinition } from './definition.js';
import { WysiwygEditor } from './editor.js';

export default createItem<WysiwygData>({ ...wysiwygDefinition, Editor: WysiwygEditor });
