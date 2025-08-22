import type {
	FileListItem,
	FileListResult,
	FileRequestOptions,
} from '@burger-editor/core';

import fs from 'node:fs/promises';
import path from 'node:path';

import { validateClientPath } from '../helpers/client-path-validation.js';
import { encode, parseName } from '../helpers/file-name.js';
import { pagination } from '../helpers/pagination.js';

const EXCLUDE_FILE_NAMES = [/^\..+/, 'Thumbs.db', 'desktop.ini', '$RECYCLE.BIN'];

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
		const buffer = await file.arrayBuffer();
		const ext = path.extname(file.name);
		const fileBaseName = path.basename(file.name, ext);
		const fileId = this.maxFileId() + 1;
		const name = encode(fileBaseName);
		const fileName = `${fileId}__${name}${ext}`;
		const filePath = path.join(this.#serverDir, fileName);
		await fs.writeFile(filePath, Buffer.from(buffer));
		const stats = await fs.stat(filePath);
		this.#allFileListCache = null;
		const result = await this.getList();
		return {
			uploaded: {
				fileId: fileId.toString(),
				name: fileBaseName,
				url: `${this.#clientDir}/${fileName}`,
				size: stats.size,
				timestamp: stats.mtime.valueOf(),
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
		const fileNames = await fs.readdir(this.#serverDir).catch(() => []);
		const filePaths = fileNames.map((name) => ({
			server: path.resolve(this.#serverDir, name),
			client: path.join(this.#clientDir, name),
		}));

		type FileData = Omit<FileListItem, 'sizes'> & { __size: string };

		const excludes = EXCLUDE_FILE_NAMES.map((name) =>
			typeof name === 'string' ? path.join(this.#serverDir, name) : name,
		);

		const allFiles = await Promise.all(
			filePaths
				.filter(
					({ server }) =>
						!(
							excludes.some((exclude) => {
								// Exclude files (Ex. .DS_Store)
								if (exclude instanceof RegExp) {
									return exclude.test(path.basename(server));
								}
								return exclude === server;
							}) ||
							// Exclude sample image
							server === this.#samplePath?.server
						),
				)
				.map<Promise<FileData | null>>(async (file) => {
					const { fileId, name, size } = parseName(file.server);
					const stat = await fs.stat(file.server);

					return {
						fileId: fileId ?? 'N/A',
						name,
						url: file.client,
						size: stat.size,
						timestamp: stat.mtime.valueOf(),
						__size: size,
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
			const stat = await fs.stat(this.#samplePath.server);

			list.unshift({
				fileId: 'sample',
				name: 'sample',
				url: this.#samplePath.client,
				size: stat.size,
				timestamp: stat.mtime.valueOf(),
				sizes: {},
			});
		}

		this.#allFileListCache = list;

		return list;
	}

	#getServerPath(clientPath: string): string {
		return path.resolve(this.#serverDir, path.relative(this.#clientDir, clientPath));
	}
}
