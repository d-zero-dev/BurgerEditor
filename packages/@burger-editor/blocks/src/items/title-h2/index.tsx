import type { TitleH2Data } from './definition.js';

import { createItem } from '@burger-editor/core';

import { titleH2Definition } from './definition.js';
import { TitleH2Editor } from './editor.js';

export default createItem<TitleH2Data>({ ...titleH2Definition, Editor: TitleH2Editor });
