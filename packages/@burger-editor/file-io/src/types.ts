import type { BlockCatalog, Config, FileType } from '@burger-editor/core';

/**
 * Configuration loaded via cosmiconfig from the searched
 * `burgereditor.config.{js,mjs,ts,cjs}`, or from a file named with `--config`
 * / `BGE_CONFIG`. Shared between the local CMS server (`@burger-editor/local`)
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
	/**
	 * Media queries offered for an image's `<source>` and used as its default.
	 * See `Config.mediaQueries` in `@burger-editor/core`.
	 */
	readonly mediaQueries?: readonly string[];
	readonly open: boolean;
	readonly newFileContent: string;
	readonly catalog: BlockCatalog;
	readonly enableImportBlock: boolean;
	readonly healthCheck: {
		readonly enabled: boolean;
		readonly interval: number;
		readonly retryCount: number;
	};
	/**
	 * Experimental, per-item options. The shape is exactly
	 * `Config['experimental']` of `@burger-editor/core`, and `resolveConfig()`
	 * hands it over without touching it, so whatever the editor reads is what a
	 * config file may declare.
	 *
	 * The shape is derived rather than restated here, because a restated copy
	 * drifts from what the editor reads and hides supported options from the
	 * config file's type.
	 * @example
	 * ```js
	 * export default {
	 * 	experimental: {
	 * 		itemOptions: {
	 * 			button: {
	 * 				beforeIcons: [{ value: 'arrow', label: '矢印' }],
	 * 			},
	 * 		},
	 * 	},
	 * };
	 * ```
	 */
	readonly experimental?: Config['experimental'];
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
