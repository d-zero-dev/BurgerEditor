import { camelCase } from './utils.js';

/**
 *
 * @param field
 */
export function fieldNameParser(field: string) {
	field = field.trim().toLowerCase();
	if (!field) {
		throw new Error('Field name is empty.');
	}
	let [fieldName, propName] = field.split(':') as [string | null, string | null];
	propName = propName?.trim() || '';
	fieldName = fieldName?.trim() || propName || field;

	return {
		fieldName: camelCase(fieldName),
		propName,
	};
}
