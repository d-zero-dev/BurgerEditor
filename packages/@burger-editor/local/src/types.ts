import type { FileType } from '@burger-editor/core';

export interface LocalServerConfig {
	readonly version: string;
	readonly port: number;
	readonly host: 'localhost' | `${number}.${number}.${number}.${number}`;
	readonly documentRoot: string;
	readonly lang: string;
	readonly stylesheets: readonly string[];
	readonly classList: readonly string[];
	readonly editableArea: string | null;
	readonly filesDir: LocalServerFileDirConfig;
	readonly sampleImagePath: `/${string}` | `https://${string}` | `base64:${string}`;
	readonly googleMapsApiKey: string | null;
	readonly open: boolean;
}

export type LocalServerFileDirConfig = Record<FileType, FileDirSettings>;

export type LocalServerConfigUserSettings = Omit<
	Partial<LocalServerConfig>,
	'filesDir'
> & {
	readonly filesDir?: string | FileDirSettings | LocalServerFileDirUserSettings;
};

export type LocalServerFileDirUserSettings = {
	[key in keyof LocalServerFileDirConfig]?: string | FileDirSettings;
};

export interface FileDirSettings {
	readonly serverPath: string;
	readonly clientPath: `/${string}`;
}
