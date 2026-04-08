import { createBlock } from '@burger-editor/migrator/v3';

import { blockNameSchema } from './blocks.js';
import { getItemParams } from './get-item-params.js';

export default {
	getItemParams,
	createBlock,
	blockNameSchema,
};
