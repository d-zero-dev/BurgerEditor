import type { YoutubeData } from './definition.js';

import { createItem } from '@burger-editor/core';

import { youtubeDefinition } from './definition.js';
import { YoutubeEditor } from './editor.js';

export default createItem<YoutubeData>({ ...youtubeDefinition, Editor: YoutubeEditor });
