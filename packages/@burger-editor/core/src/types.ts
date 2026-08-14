import type { BurgerBlock } from './block/block.js';
import type { ContainerProps } from './block/types.js';
import type { BurgerEditorEngine } from './engine/engine.js';
import type { HealthCheckFunction } from './health-monitor.js';
import type { ItemData, ItemSeed } from './item/types.js';
import type { Mergeable } from '@burger-editor/utils';

export interface BurgerEditorEngineOptions {
	readonly root: string;
	readonly config: Config;
	readonly viewAreaClassList?: readonly string[];
	readonly initialContents:
		| string
		| {
				readonly main: string;
				readonly draft?: string;
		  };
	readonly blocks?: Record<string, BlockDefinition>;
	readonly items: Record<string, ItemSeed>;
	readonly catalog: BlockCatalog;
	readonly generalCSS: string;
	readonly view?: BurgerEditorView;
	readonly storageKey?: {
		readonly blockClipboard?: string;
	};
	readonly defineCustomElement?: (context: {
		readonly className?: string;
		readonly experimental?: Config['experimental'];
	}) => void | Promise<void>;
	readonly onUpdated?: (main: string, draft?: string) => void | Promise<void>;
	readonly fileIO?: FileAPI;
	readonly healthCheck?: {
		readonly enabled?: boolean;
		readonly interval?: number;
		readonly retryCount?: number;
		readonly checkHealth?: HealthCheckFunction;
	};
}

export type EditableAreaType = 'main' | 'draft';

/**
 * The single injection point through which the engine obtains its UI.
 *
 * The engine never receives references to UI-owned DOM (iframes,
 * textareas, menus) and therefore cannot mutate their attributes — the
 * only element crossing the boundary is the {@link EditableAreaHost}'s
 * `containerElement`, whose contents the engine owns. All presentation
 * state (visibility, visual/source mode, sizing) is rendered by the UI
 * layer from `engine.uiState` and engine events instead of being driven
 * imperatively from the engine.
 * @example
 * ```ts
 * function createMyView(): BurgerEditorView {
 * 	const teardown = () => {
 * 		// Unmount everything created by createAreaHost.
 * 	};
 * 	return {
 * 		async createAreaHost({ engine, stylesheets, classList }) {
 * 			// Build the area UI (e.g. mount a React component) and resolve
 * 			// once the content container exists.
 * 			return { containerElement };
 * 		},
 * 		// destroy and [Symbol.dispose] point at the same function — a
 * 		// `this`-dependent implementation breaks if a caller pulls
 * 		// `destroy` off the object before calling it.
 * 		destroy: teardown,
 * 		[Symbol.dispose]: teardown,
 * 	};
 * }
 * const engine = await BurgerEditorEngine.new({ ...options, view: createMyView() });
 * ```
 */
export interface BurgerEditorView extends Disposable {
	/**
	 * Create the host UI for one editable area (`main` or `draft`) and
	 * resolve with the content container the engine will own.
	 * @param context - The area being created and the resources to render it
	 */
	createAreaHost(context: EditableAreaHostContext): Promise<EditableAreaHost>;

	/**
	 * Tear down everything created by `createAreaHost`.
	 * @deprecated Use a `using` declaration (`[Symbol.dispose]`) instead.
	 */
	destroy(): void;
}

export interface EditableAreaHostContext {
	readonly type: EditableAreaType;
	readonly engine: BurgerEditorEngine;
	/** The serialized content the area starts with */
	readonly initialContent: string;
	/** Resolved stylesheet blob URLs to load into the area's document */
	readonly stylesheets: readonly { readonly path: string; readonly id: string }[];
	readonly classList: readonly string[];
}

export interface EditableAreaHost {
	/**
	 * The element the edited blocks live in. This is the only UI-provided
	 * element the engine holds a reference to; the engine owns its
	 * contents from here on (the UI layer must not manage them).
	 */
	readonly containerElement: HTMLElement;

	/**
	 * Animate the block-insertion marker. Optional presentation hook —
	 * when absent the engine treats the insertion as instantly complete.
	 * @param markerEl - The marker element wrapping the inserted block
	 */
	readonly animateInsertion?: (markerEl: HTMLElement) => Promise<void>;
}

export interface BlockCatalog {
	readonly [category: string]: ReadonlyArray<CatalogItem>;
}
export interface CatalogItem {
	readonly label: string;
	readonly definition: BlockDefinition;
}

export interface Config {
	readonly classList: readonly string[];
	readonly stylesheets: readonly {
		readonly path: string;
		readonly layer?: string;
	}[];
	readonly sampleImagePath: string;
	readonly sampleFilePath: string;
	readonly googleMapsApiKey: string | null;
	readonly experimental?: {
		readonly itemOptions?: {
			readonly wysiwyg?: {
				readonly enableTextOnlyMode?: boolean;
			};
			readonly button?: {
				readonly kinds?: readonly Mergeable<SelectableValue>[];
				readonly beforeIcons?: readonly Mergeable<SelectableValue>[];
				readonly afterIcons?: readonly Mergeable<SelectableValue>[];
			};
		};
	};
}

export interface Actions {
	'file-listup': {
		readonly fileType: FileType;
		readonly data: readonly FileListItem[];
	};
	'file-select': {
		readonly path: string;
		readonly fileSize: number;
		readonly isEmpty: boolean;
		readonly isMounted?: boolean;
	};
	'file-upload-progress': {
		readonly blob: string;
		readonly uploaded: number;
		readonly total: number;
	};
	'file-upload-complete': {
		readonly uploaded: FileListItem;
		readonly data: readonly FileListItem[];
	};
	'select-block': {
		readonly block: BurgerBlock;
		readonly width: number;
		readonly height: number;
		readonly x: number;
		readonly y: number;
		readonly marginBlockEnd: number;
	};
	// Use on test
	'update-css-width': {
		readonly cssWidth: string;
	};
}

export interface FileAPI {
	readonly getFileList?: (
		fileType: FileType,
		options: FileRequestOptions,
	) => Promise<FileListResult>;
	readonly postFile?: (
		fileType: FileType,
		file: File,
		progress: (uploaded: number, total: number) => Promise<void> | void,
	) => Promise<{
		readonly error: boolean;
		readonly uploaded: FileListItem;
		readonly result: FileListResult;
	}>;
	readonly deleteFile?: (
		fileType: FileType,
		url: string,
	) => Promise<{
		readonly error: boolean;
	}>;
}

export interface FileRequestOptions {
	readonly filter?: string;
	readonly page?: number;
	readonly selected?: string;
}

export type FileType = 'image' | 'pdf' | 'video' | 'audio' | 'other';

export interface FileListResult {
	readonly error: boolean;
	readonly data: readonly FileListItem[];
	readonly pagination: FileListPagination;
}

export interface FileListPagination {
	readonly current: number;
	readonly total: number;
}

export interface FileListItem {
	readonly fileId: string;
	readonly name: string;
	readonly url: string;
	readonly size: number;
	readonly timestamp: number;
	readonly sizes: {
		readonly original?: string | null;
		readonly small?: string | null;
	};
}

export interface BlockData {
	readonly name: string;
	readonly containerProps: Partial<ContainerProps>;
	readonly classList?: readonly string[];
	readonly style?: Record<string, string>;
	readonly id?: string | null;
	readonly items: BlockItemStructure;
}

export interface BlockDefinition extends Omit<BlockData, 'id'> {
	readonly img?: string;
	readonly svg?: string;
}

export type BlockItemStructure = ReadonlyArray<ReadonlyArray<BlockItem>>;

export type BlockItem =
	| string // "xxx" - アイテム名のみ
	| {
			readonly name: string;
			readonly data?: ItemData;
	  }; // { name: "xxx", data?: ... } - アイテム名と初期データ

/**
 * 選択可能な値のベース型
 */
export interface SelectableValue extends Record<string, unknown> {
	readonly value: string;
	readonly label: string;
}

export interface BurgerEditorEventMap {
	'bge:saved': { main: string; draft?: string };
	'bge:switch-content': { content: 'main' | 'draft' };
	'bge:block-change': { readonly block: BurgerBlock };
	'bge:server-online': { timestamp: number };
	'bge:server-offline': { timestamp: number };
}

declare global {
	interface ElementEventMap {
		'bge:saved': CustomEvent<BurgerEditorEventMap['bge:saved']>;
		'bge:switch-content': CustomEvent<BurgerEditorEventMap['bge:switch-content']>;
		'bge:block-change': CustomEvent<BurgerEditorEventMap['bge:block-change']>;
		'bge:server-online': CustomEvent<BurgerEditorEventMap['bge:server-online']>;
		'bge:server-offline': CustomEvent<BurgerEditorEventMap['bge:server-offline']>;
	}
}
