import type { GoogleMapsData } from './definition.js';

import { createItem } from '@burger-editor/core';

import { googleMapsDefinition } from './definition.js';
import { GoogleMapsEditor } from './editor.js';

export default createItem<GoogleMapsData>({
	...googleMapsDefinition,
	Editor: GoogleMapsEditor,
});
