import type { CarouselData } from './definition.js';

import { createItem } from '@burger-editor/core';

import { carouselDefinition } from './definition.js';
import { CarouselEditor } from './editor.js';

export default createItem<CarouselData>({
	...carouselDefinition,
	Editor: CarouselEditor,
});
