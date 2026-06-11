import type {
	BurgerEditorConfig,
	BurgerEditorConfigUserSettings,
	BurgerEditorFileDirConfig,
	BurgerEditorFileDirUserSettings,
} from '@burger-editor/file-io';

// LocalServerConfig is the SAME shape as BurgerEditorConfig today, but is
// declared as an explicit Pick so a future widening of BurgerEditorConfig in
// @burger-editor/file-io doesn't silently widen this package's surface. When
// a new field is added that local should consume, add the key here so the
// switch over LocalServerConfig fields breaks exhaustiveness checks.
type LocalKeys =
	| 'version'
	| 'port'
	| 'host'
	| 'documentRoot'
	| 'assetsRoot'
	| 'lang'
	| 'stylesheets'
	| 'classList'
	| 'editableArea'
	| 'indexFileName'
	| 'filesDir'
	| 'sampleImagePath'
	| 'sampleFilePath'
	| 'googleMapsApiKey'
	| 'open'
	| 'newFileContent'
	| 'catalog'
	| 'enableImportBlock'
	| 'healthCheck'
	| 'experimental'
	| 'virtualTree';

export type LocalServerConfig = Pick<BurgerEditorConfig, LocalKeys>;
export type LocalServerConfigUserSettings = BurgerEditorConfigUserSettings;
export type LocalServerFileDirConfig = BurgerEditorFileDirConfig;
export type LocalServerFileDirUserSettings = BurgerEditorFileDirUserSettings;

// Front Matter / load result types are now re-exported from core.
export type { LoadContentResult, ParsedFrontMatter } from '@burger-editor/core';

export type {
	FileDirSettings,
	SamplePath,
	VirtualTreeConfig,
} from '@burger-editor/file-io';
