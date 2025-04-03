import type { BurgerBlock } from './block/block.js';
import type { BurgerEditorEngine } from './engine/engine.js';
import type { ItemEditorService } from './item/item-editor-service.js';
import type { Item } from './item/item.js';
import type { ItemData, ItemSeed } from './item/types.js';
import type { ItemEditorDialog } from './item-editor-dialog.js';

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
	readonly blocks: Record<string, BlockTemplate>;
	readonly items: Record<string, ItemSeed>;
	readonly catalog: BlockCatalog;
	readonly generalCSS: string;
	readonly ui: UIOptions;
	readonly blockMenu: UICreator;
	readonly storageKey?: {
		readonly blockClipboard?: string;
	};
	readonly onUpdated?: (main: string, draft?: string) => void | Promise<void>;
	readonly fileIO?: FileAPI;
}

export interface UIOptions {
	readonly blockCatalog?: UICreator;
	readonly blockOptions?: UICreator;
	readonly imageList?: UICreator;
	readonly fileList?: UICreator;
	readonly imageUploader?: UICreator;
	readonly fileUploader?: UICreator;
	readonly preview?: UICreator;
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

export interface BlockCatalog {
	readonly [category: string]: {
		readonly [block: string]: CatalogItem | string;
	};
}

export interface CatalogItem {
	readonly label: string;
	readonly img?: string;
	readonly svg?: string;
}

export interface Config {
	readonly classList: readonly string[];
	readonly stylesheets: readonly string[];
	readonly sampleImagePath: string;
	readonly googleMapsApiKey: string | null;
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

export interface BlockTemplate {
	readonly name: string;
	readonly template: string;
	readonly icon: string;
}

export interface BurgerEditorEventMap {
	'bge:saved': { main: string; draft?: string };
	'bge:switch-content': { content: 'main' | 'draft' };
	'bge:block-change': { readonly block: BurgerBlock };
}

declare global {
	interface ElementEventMap {
		'bge:saved': CustomEvent<BurgerEditorEventMap['bge:saved']>;
		'bge:switch-content': CustomEvent<BurgerEditorEventMap['bge:switch-content']>;
		'bge:block-change': CustomEvent<BurgerEditorEventMap['bge:block-change']>;
	}
}
