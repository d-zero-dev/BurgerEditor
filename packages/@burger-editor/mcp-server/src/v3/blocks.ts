import { blocks } from '@burger-editor/legacy/v3';
import { z } from 'zod';

export const blockNames = Object.keys(blocks) as (keyof typeof blocks)[];

export const blockNameSchema = z
	.enum(['button', ...blockNames])
	.describe(
		`The name of the block to create. Available blocks: ${blockNames.join(', ')}`,
	);
