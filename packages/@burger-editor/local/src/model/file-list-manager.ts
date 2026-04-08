import type {
	FileListItem,
	FileListResult,
	FileRequestOptions,
} from '@burger-editor/core';

import fs from 'node:fs/promises';
import path from 'node:path';

import { validateClientPath } from '../helpers/client-path-validation.js';
import { getCandidateName } from '../helpers/get-candidate-name.js';
import { pagination } from '../helpers/pagination.js';
import { scanDirectory } from '../helpers/scan-directory.js';
import { upload } from '../helpers/upload.js';

export class FileListManager {
	#allFileListCache: FileListItem[] | null = null;
	#clientDir: string;
	#paginationNumber: number;
	#samplePath: {
		server: string;
		client: string;
	} | null;
	#serverDir: string;

	constructor(
		serverDir: string,
		clientDir: string,
		samplePath: string | null = null,
		paginationNumber = 10,
	) {
		if (!validateClientPath(samplePath)) {
			throw new TypeError(
				`Invalid Sample Path: "${samplePath}". Must start with "/", "https://", or "base64:".`,
			);
		}

		this.#serverDir = serverDir;
		this.#clientDir = clientDir;
		this.#paginationNumber = paginationNumber;
		this.#samplePath = samplePath
			? {
					server: this.#getServerPath(samplePath),
					client: samplePath,
				}
			: null;
	}

	async add(file: File): Promise<{
		readonly uploaded: FileListItem;
		readonly result: FileListResult;
	}> {
		// Get candidate file name
		const fileName = await getCandidateName(file.name, this.#serverDir);

		// Upload with the candidate name
		const uploadResult = await upload(fileName, this.#serverDir, file);

		// Clear cache after upload
		this.#allFileListCache = null;

		// Get updated list
		const result = await this.getList();

		// Convert UploadResult to FileListItem with URL
		return {
			uploaded: {
				fileId: uploadResult.fileId.toString(),
				name: uploadResult.name,
				url: `${this.#clientDir}/${uploadResult.fileName}`,
				size: uploadResult.size,
				timestamp: uploadResult.timestamp,
				sizes: {},
			},
			result,
		};
	}

	async delete(url: string): Promise<boolean> {
		const fileName = path.basename(url);
		const filePath = path.join(this.#serverDir, fileName);
		try {
			await fs.unlink(filePath);
			this.#allFileListCache = null;
			return true;
		} catch {
			return false;
		}
	}

	async getList(options?: FileRequestOptions): Promise<FileListResult> {
		const allList = await this.#getAllList();

		const pages = pagination(allList, this.#paginationNumber, {
			page: options?.page ?? 0,
			filter: options?.filter
				? (item) =>
						item.name.includes(options.filter!) || item.fileId.includes(options.filter!)
				: undefined,
			selected: options?.selected ? (item) => item.url === options.selected : undefined,
		});

		return {
			...pages,
			error: false,
		};
	}

	maxFileId(): number {
		if (!this.#allFileListCache) {
			return 0;
		}
		// eslint-disable-next-line unicorn/no-array-reduce
		return this.#allFileListCache.reduce((max, item) => {
			const fileId = Number.parseInt(item.fileId);
			if (Number.isNaN(fileId)) {
				return max;
			}
			return Math.max(max, fileId);
		}, 0);
	}

	async #getAllList(): Promise<FileListItem[]> {
		// Use shared scanDirectory function
		const excludePaths = this.#samplePath ? [this.#samplePath.server] : [];
		const scannedFiles = await scanDirectory(this.#serverDir, excludePaths);

		type FileData = Omit<FileListItem, 'sizes'> & { __size: string };

		const allFiles = await Promise.all(
			scannedFiles.map<Promise<FileData | null>>(async (file) => {
				const stat = await fs.stat(file.serverPath);
				const clientUrl = path.join(this.#clientDir, path.basename(file.serverPath));

				return {
					fileId: file.fileId,
					name: file.name,
					url: clientUrl,
					size: stat.size,
					timestamp: stat.mtime.valueOf(),
					__size: file.size,
				};
			}),
		);

		const fileMap = new Map<
			string,
			{
				std?: FileData;
				original?: FileData;
				small?: FileData;
			}
		>();

		for (const file of allFiles) {
			if (file === null) {
				continue;
			}
			const data = fileMap.get(file.fileId) ?? {};

			if (file.__size === 'org' || file.__size === 'original') {
				data.original = file;
			} else if (
				file.__size === 'small' ||
				file.__size === 'sm' ||
				file.__size === 'thumb' ||
				file.__size === 'thumbnail'
			) {
				data.small = file;
			} else {
				data.std = file;
			}

			fileMap.set(file.fileId, data);
		}

		const list = fileMap
			.values()
			.toArray()
			.map<FileListItem | null>((data) =>
				data.std
					? {
							...data.std,
							sizes: {
								original: data.original?.url,
								small: data.small?.url,
							},
						}
					: null,
			)
			.filter((f): f is FileListItem => f !== null)
			.toSorted((a, b) => Number.parseInt(a.fileId) - Number.parseInt(b.fileId))
			.toReversed();

		if (this.#samplePath) {
			const stat = await fs.stat(this.#samplePath.server).catch(() => null);
			if (stat) {
				list.unshift({
					fileId: 'sample',
					name: 'sample',
					url: this.#samplePath.client,
					size: stat.size,
					timestamp: stat.mtime.valueOf(),
					sizes: {},
				});
			}
		}

		this.#allFileListCache = list;

		return list;
	}

	#getServerPath(clientPath: string): string {
		return path.resolve(this.#serverDir, path.relative(this.#clientDir, clientPath));
	}
}
