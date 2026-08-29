import type { BlockCatalog, FileType, SelectableValue } from '@burger-editor/core';
import type { Mergeable } from '@burger-editor/utils';

/**
 * Configuration loaded from `burgereditor.config.{js,mjs,ts,cjs,json}` via
 * cosmiconfig. Shared between the local CMS server (`@burger-editor/local`)
 * and the agent-facing CLI/MCP layer.
 */
export interface BurgerEditorConfig {
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
	readonly filesDir: BurgerEditorFileDirConfig;
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
			readonly wysiwyg?: {
				readonly enableTextOnlyMode?: boolean;
			};
		};
	};
	readonly virtualTree: VirtualTreeConfig;
	readonly agent: AgentConfig;
}

/**
 * Configuration for the Virtual File Tree feature.
 */
export interface VirtualTreeConfig {
	readonly enabled: boolean;
	readonly pathKey: string;
}

/**
 * Configuration for the AI agent hub (`@burger-editor/local`'s WebSocket +
 * `/api/agent/*` routes). Disabling it turns off the WebSocket upgrade and
 * agent REST routes while leaving the rest of the server (including the
 * `Host`/`Origin` guard) unaffected.
 * @example
 * ```ts
 * const agent: AgentConfig = { enabled: false }; // serve pages, no agent hub
 * ```
 */
export interface AgentConfig {
	readonly enabled: boolean;
}

export type SamplePath = `/${string}` | `https://${string}` | `base64:${string}`;

export type BurgerEditorFileDirConfig = Record<FileType, FileDirSettings>;

export type BurgerEditorConfigUserSettings = Omit<
	Partial<BurgerEditorConfig>,
	'filesDir' | 'healthCheck' | 'virtualTree' | 'agent'
> & {
	readonly assetsRoot?: string;
	readonly filesDir?: string | FileDirSettings | BurgerEditorFileDirUserSettings;
	readonly healthCheck?: Partial<BurgerEditorConfig['healthCheck']>;
	readonly virtualTree?: Partial<VirtualTreeConfig>;
	readonly agent?: Partial<AgentConfig>;
};

export type BurgerEditorFileDirUserSettings = {
	[key in keyof BurgerEditorFileDirConfig]?: string | FileDirSettings;
};

export interface FileDirSettings {
	readonly serverPath: string;
	readonly clientPath: `/${string}`;
}
