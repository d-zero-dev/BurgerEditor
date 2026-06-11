/**
 * Result of Front Matter processing
 */
export interface ParsedFrontMatter {
	/** Front Matter data (metadata defined in YAML, etc.) */
	readonly data: Record<string, unknown>;
	/** HTML content excluding Front Matter */
	readonly content: string;
	/** Original Front Matter string (for format preservation) */
	readonly originalFrontMatter?: string;
	/** Whether Front Matter existed */
	readonly hasFrontMatter: boolean;
}

/**
 * File loading result (Front Matter compatible version)
 */
export interface LoadContentResult {
	/** HTML of editable area */
	readonly editableContent: string;
	/** Front Matter data */
	readonly frontMatter: Record<string, unknown>;
	/** Original Front Matter string */
	readonly originalFrontMatter?: string;
	/** Whether Front Matter exists */
	readonly hasFrontMatter: boolean;
}
