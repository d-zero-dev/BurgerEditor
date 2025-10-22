import { beforeEach, describe, expect, test, vi } from 'vitest';

const virtualFs = vi.hoisted(() => new Map<string, string>());

vi.mock('node:fs/promises', () => ({
	default: {
		readFile(filePath: string) {
			const content = virtualFs.get(filePath);
			if (content === undefined) {
				const error: NodeJS.ErrnoException = new Error(
					`ENOENT: no such file or directory, open '${filePath}'`,
				);
				error.code = 'ENOENT';
				return Promise.reject(error);
			}
			return Promise.resolve(content);
		},
	},
}));

import { importBlock } from './index.js';

describe('importBlock', () => {
	beforeEach(() => {
		virtualFs.clear();
	});

	test('should import blocks from absolute path', async () => {
		virtualFs.set(
			'/root/imported.html',
			`
				<div data-bge-container data-bgi="text">
					<p>Imported content 1</p>
				</div>
				<div data-bge-container data-bgi="text">
					<p>Imported content 2</p>
				</div>
			`,
		);

		document.body.innerHTML = `
			<div data-bge-container>
				<div data-bge-container-frame>
					<div data-bge-group>
						<div data-bge-item>
							<div data-bgi="import">
								<bge-import src="/imported.html"></bge-import>
							</div>
						</div>
					</div>
				</div>
			</div>
		`;

		await importBlock([document.body], '/root');

		const importElement = document.querySelector('bge-import');
		expect(importElement).toBeNull();

		const importedBlocks = document.querySelectorAll('[data-bge-container]');
		expect(importedBlocks).toHaveLength(2);
		expect(importedBlocks[0]?.textContent?.trim()).toContain('Imported content 2');
		expect(importedBlocks[1]?.textContent?.trim()).toContain('Imported content 1');
	});

	test('should handle multiple import blocks', async () => {
		virtualFs.set(
			'/root/file1.html',
			`
				<div data-bge-container data-bgi="text">
					<p>File 1 content</p>
				</div>
			`,
		);
		virtualFs.set(
			'/root/file2.html',
			`
				<div data-bge-container data-bgi="text">
					<p>File 2 content</p>
				</div>
			`,
		);

		document.body.innerHTML = `
			<div data-bge-container>
				<div data-bge-container-frame>
					<div data-bge-group>
						<div data-bge-item>
							<div data-bgi="import">
								<bge-import src="/file1.html"></bge-import>
							</div>
						</div>
					</div>
				</div>
			</div>
			<div data-bge-container>
				<div data-bge-container-frame>
					<div data-bge-group>
						<div data-bge-item>
							<div data-bgi="import">
								<bge-import src="/file2.html"></bge-import>
							</div>
						</div>
					</div>
				</div>
			</div>
		`;

		await importBlock([document.body], '/root');

		const importedBlocks = document.querySelectorAll('[data-bge-container]');
		expect(importedBlocks).toHaveLength(2);
		expect(importedBlocks[0]?.textContent?.trim()).toContain('File 1 content');
		expect(importedBlocks[1]?.textContent?.trim()).toContain('File 2 content');
	});

	test('should handle nested import blocks', async () => {
		virtualFs.set(
			'/root/nested.html',
			`
				<div data-bge-container data-bgi="text">
					<p>Nested import content</p>
				</div>
			`,
		);

		document.body.innerHTML = `
			<div data-bge-container>
				<div data-bge-container-frame>
					<div data-bge-group>
						<div data-bge-item>
							<div data-bgi="import">
								<bge-import src="/nested.html"></bge-import>
							</div>
						</div>
					</div>
				</div>
			</div>
		`;

		await importBlock([document.body], '/root');

		const importElement = document.querySelector('bge-import');
		expect(importElement).toBeNull();

		const importedBlock = document.querySelector('[data-bge-container][data-bgi="text"]');
		expect(importedBlock).not.toBeNull();
		expect(importedBlock?.textContent?.trim()).toContain('Nested import content');
	});

	test('should skip import block without src attribute', async () => {
		document.body.innerHTML = `
			<div data-bge-container>
				<div data-bge-container-frame>
					<div data-bge-group>
						<div data-bge-item>
							<div data-bgi="import">
								<bge-import></bge-import>
							</div>
						</div>
					</div>
				</div>
			</div>
		`;

		await importBlock([document.body], '/root');

		const importElement = document.querySelector('bge-import');
		expect(importElement).not.toBeNull();
	});

	test('should throw error for relative paths', async () => {
		document.body.innerHTML = `
			<div data-bge-container>
				<div data-bge-container-frame>
					<div data-bge-group>
						<div data-bge-item>
							<div data-bgi="import">
								<bge-import src="./relative.html"></bge-import>
							</div>
						</div>
					</div>
				</div>
			</div>
		`;

		await expect(importBlock([document.body], '/root')).rejects.toThrow(
			'相対パスには未対応です。"./relative.html"',
		);
	});

	test('should throw error when file cannot be read', async () => {
		document.body.innerHTML = `
			<div data-bge-container>
				<div data-bge-container-frame>
					<div data-bge-group>
						<div data-bge-item>
							<div data-bgi="import">
								<bge-import src="/nonexistent.html"></bge-import>
							</div>
						</div>
					</div>
				</div>
			</div>
		`;

		await expect(importBlock([document.body], '/root')).rejects.toThrow(
			'bge-import要素のsrc属性のファイルが読み込めませんでした。"/root/nonexistent.html"',
		);
	});

	test('should handle empty elements array', async () => {
		await expect(importBlock([], '/root')).resolves.toBeUndefined();
	});

	test('should handle elements without import blocks', async () => {
		document.body.innerHTML = `
			<div data-bge-container data-bgi="text">
				<p>Regular content</p>
			</div>
		`;

		const container = document.querySelector('[data-bge-container]');
		expect(container).not.toBeNull();

		await importBlock([document.body], '/root');

		const textContent = document.body.textContent?.trim();
		expect(textContent).toContain('Regular content');
	});
});
