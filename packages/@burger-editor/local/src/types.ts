import type { BlockCatalog, FileType, SelectableValue } from '@burger-editor/core';
import type { Mergeable } from '@burger-editor/utils';

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
	readonly indexFileName: string;
	readonly filesDir: LocalServerFileDirConfig;
	readonly sampleImagePath: SamplePath;
	readonly sampleFilePath: SamplePath;
	readonly googleMapsApiKey: string | null;
	readonly open: boolean;
	readonly newFileContent: string;
	readonly catalog: BlockCatalog;
	readonly enableImportBlock: boolean;
	readonly healthCheck: {
		readonly enabled: boolean;
		readonly interval: number;
		readonly retryCount: number;
	};
	readonly experimental?: {
		readonly itemOptions?: {
			readonly button?: {
				readonly kinds?: readonly Mergeable<SelectableValue>[];
			};
		};
	};
}

export type SamplePath = `/${string}` | `https://${string}` | `base64:${string}`;

export type LocalServerFileDirConfig = Record<FileType, FileDirSettings>;

export type LocalServerConfigUserSettings = Omit<
	Partial<LocalServerConfig>,
	'filesDir' | 'healthCheck'
> & {
	readonly assetsRoot?: string;
	readonly filesDir?: string | FileDirSettings | LocalServerFileDirUserSettings;
	readonly healthCheck?: Partial<LocalServerConfig['healthCheck']>;
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
