import type { BurgerBlock } from './block/block.js';
import type { ContainerProps } from './block/types.js';
import type { BurgerEditorEngine } from './engine/engine.js';
import type { HealthCheckFunction } from './health-monitor.js';
import type { ItemEditorService } from './item/item-editor-service.js';
import type { Item } from './item/item.js';
import type { ItemData, ItemSeed } from './item/types.js';
import type { ItemEditorDialog } from './item-editor-dialog.js';
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
	readonly ui: UIOptions;
	readonly blockMenu: BlockMenuCreator;
	readonly initialInsertionButton?: InitialInsertionButtonCreator;
	readonly dialogShell?: EditorDialogShellCreator;
	readonly editableAreaShell?: EditableAreaShellCreator;
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

export interface UIOptions {
	readonly blockCatalog?: UICreator;
	readonly blockOptions?: UICreator;
	readonly imageList?: UICreator;
	readonly fileList?: UICreator;
	readonly imageUploader?: UICreator;
	readonly fileUploader?: UICreator;
	readonly preview?: UICreator;
	readonly tabs?: UICreator;
	readonly tableEditor?: UICreator;
}

export interface UICreator {
	(
		el: HTMLElement,
		engine: BurgerEditorEngine,
	): {
		readonly cleanUp: () => void;
	};
}

export interface BlockMenuCreator {
	(
		container: HTMLElement,
		engine: BurgerEditorEngine,
	): {
		hide(): void;
		readonly cleanUp: () => void;
	};
}

export interface InitialInsertionButtonCreator {
	(
		container: HTMLElement,
		onInsert: () => void,
	): {
		readonly cleanUp: () => void;
	};
}

export interface EditorDialogShell {
	readonly dialogElement: HTMLDialogElement;
	readonly containerElement: HTMLElement;
	readonly formElement: HTMLFormElement;
}

export interface EditorDialogShellCreator {
	(options: {
		readonly name: string;
		readonly buttons?: {
			readonly close?: string;
			readonly complete?: string;
		};
	}): EditorDialogShell;
}

export interface EditableAreaShell {
	readonly viewNode: HTMLElement;
	readonly frameElement: HTMLIFrameElement;
	readonly sourceTextarea: HTMLTextAreaElement;
	readonly containerElement: HTMLElement;
}

export interface EditableAreaShellCreator {
	(options: {
		readonly type: string;
		readonly initialContent: string;
		readonly stylesheets: readonly { readonly path: string; readonly id: string }[];
		readonly classList: readonly string[];
	}): EditableAreaShell;
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
	'open-editor': {
		readonly data: Readonly<ItemData>;
		readonly editor: ItemEditorDialog<{}>;
	};
	'select-block': {
		readonly block: BurgerBlock;
		readonly width: number;
		readonly height: number;
		readonly x: number;
		readonly y: number;
		readonly marginBlockEnd: number;
	};
	'select-tab-in-item-editor': {
		readonly index: number;
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

export interface ItemEditorCustomFunctions<
	T extends ItemData,
	C extends { [key: string]: unknown },
> {
	[funcName: string]: (
		this: ItemEditorService<T, C>,
		e: CustomEvent<HTMLElement>,
		editorDialog: ItemEditorDialog<T, C>,
		item: Item<T, C>,
		...args: unknown[]
	) => unknown;
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
