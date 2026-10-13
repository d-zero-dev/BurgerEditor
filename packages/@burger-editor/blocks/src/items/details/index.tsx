import type { DetailsData } from './definition.js';

import { createItem } from '@burger-editor/core';

import { detailsDefinition } from './definition.js';
import { DetailsEditor } from './editor.js';

export default createItem<DetailsData>({ ...detailsDefinition, Editor: DetailsEditor });
