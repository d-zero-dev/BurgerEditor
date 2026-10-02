import type { ImageData } from './definition.js';

import { createItem } from '@burger-editor/core';

import { imageDefinition } from './definition.js';
import { ImageEditor } from './editor.js';

export default createItem<ImageData>({ ...imageDefinition, Editor: ImageEditor });
