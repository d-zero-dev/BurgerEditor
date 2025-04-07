import type { FieldDefinition } from './types.js';

/**
 * Combines multiple field definitions with comma separation
 * @param fields Array of field definitions
 * @returns Comma-separated field definition string
 */
export function stringifyFields(fields: readonly FieldDefinition[]): string {
	return fields
		.map((field) => stringifyField(field.fieldName, field.propName))
		.join(', ');
}

/**
 * Generates a field definition string from field name and attribute name
 * @param fieldName Field name
 * @param propName Attribute name (optional)
 * @returns Field definition string
 */
export function stringifyField(fieldName: string, propName?: string): string {
	if (!propName) {
		return fieldName;
	}

	// Use shorthand notation when fieldName and propName are the same
	if (fieldName === propName) {
		return `:${propName}`;
	}

	return `${fieldName}:${propName}`;
}
