import type {
	BurgerEditorConfig,
	BurgerEditorConfigUserSettings,
	BurgerEditorFileDirConfig,
	BurgerEditorFileDirUserSettings,
} from '@burger-editor/file-io';

// Backwards-compatible aliases. The runtime config is fully defined in
// @burger-editor/file-io now (shared with the agent-facing CLI/MCP layer).
export type LocalServerConfig = BurgerEditorConfig;
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
