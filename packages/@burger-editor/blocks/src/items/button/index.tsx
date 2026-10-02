import type { ButtonData } from './definition.js';

import { createItem } from '@burger-editor/core';

import { buttonDefinition } from './definition.js';
import { ButtonEditor } from './editor.js';

export default createItem<ButtonData>({ ...buttonDefinition, Editor: ButtonEditor });
