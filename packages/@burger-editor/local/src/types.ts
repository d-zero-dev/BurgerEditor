import type { FileType } from '@burger-editor/core';

export interface LocalServerConfig {
	readonly version: string;
	readonly port: number;
	readonly host: 'localhost' | `${number}.${number}.${number}.${number}`;
	readonly documentRoot: string;
	readonly assetsRoot: string;
	readonly lang: string;
	readonly stylesheets: readonly string[];
	readonly classList: readonly string[];
	readonly editableArea: string | null;
	readonly filesDir: LocalServerFileDirConfig;
	readonly sampleImagePath: `/${string}` | `https://${string}` | `base64:${string}`;
	readonly googleMapsApiKey: string | null;
	readonly open: boolean;
	readonly newFileContent: string;
}

export type LocalServerFileDirConfig = Record<FileType, FileDirSettings>;

export type LocalServerConfigUserSettings = Omit<
	Partial<LocalServerConfig>,
	'filesDir'
> & {
	readonly assetsRoot?: string;
	readonly filesDir?: string | FileDirSettings | LocalServerFileDirUserSettings;
};

export type LocalServerFileDirUserSettings = {
	[key in keyof LocalServerFileDirConfig]?: string | FileDirSettings;
};

export interface FileDirSettings {
	readonly serverPath: string;
	readonly clientPath: `/${string}`;
}

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
