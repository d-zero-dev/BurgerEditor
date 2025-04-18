import type { FieldDefinition } from './types.js';

import { camelCase } from '@burger-editor/utils';

const cache = new Map<string, FieldDefinition[]>();

/**
 *
 * @param query
 */
export function parseFields(query: string): readonly FieldDefinition[] {
	const cached = cache.get(query);
	if (cached) {
		return cached;
	}

	const fields = query.split(',');
	const result = fields.map(parseField);
	cache.set(query, result);
	return result;
}

/**
 *
 * @param field
 */
function parseField(field: string): FieldDefinition {
	field = field.trim().toLowerCase();
	if (!field) {
		throw new Error('Field name is empty.');
	}
	let [
		fieldName,
		propName,
		// eslint-disable-next-line prefer-const
		...rest
	] = field.split(':') as [string | null, string | null, ...string[]];
	if (rest.length > 0) {
		throw new Error('Invalid field format.');
	}
	propName = propName?.trim() || '';
	fieldName = fieldName?.trim() || propName || field;

	return {
		fieldName: camelCase(fieldName),
		propName,
	};
}
