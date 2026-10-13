import type { TitleH3Data } from './definition.js';

import { createItem } from '@burger-editor/core';

import { titleH3Definition } from './definition.js';
import { TitleH3Editor } from './editor.js';

export default createItem<TitleH3Data>({ ...titleH3Definition, Editor: TitleH3Editor });
