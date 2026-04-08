import fs from 'node:fs/promises';
import path from 'node:path';

const IMPORT_BLOCK_SELECTOR = '[data-bge-container] [data-bgi=import] bge-import';

/**
 *
 * @param elements
 * @param documentRoot
 */
export async function importBlock(elements: Element[], documentRoot: string) {
	if (!elements[0]) {
		return;
	}
	const importBlocks = elements.flatMap((el) =>
		el.matches(IMPORT_BLOCK_SELECTOR)
			? el
			: [...el.querySelectorAll(IMPORT_BLOCK_SELECTOR)],
	);
	for (const importBlock of importBlocks) {
		const container = importBlock.closest('[data-bge-container]');
		if (container == null) {
			continue;
		}

		const src = importBlock.getAttribute('src');
		if (src == null) {
			continue;
		}
		const fullPath = path.isAbsolute(src) ? path.join(documentRoot, src) : null;
		if (fullPath == null) {
			// TODO: ファイルのパスを任意に受け取るようにしてパス解決する。暫定でエラーを投げる。
			throw new Error(`相対パスには未対応です。"${src}"`);
		}
		const content = await fs.readFile(fullPath, 'utf8').catch(() => null);
		if (content == null) {
			throw new Error(
				`bge-import要素のsrc属性のファイルが読み込めませんでした。"${fullPath}"`,
			);
		}
		const fragmentContainer = elements[0].ownerDocument.createElement('div');
		fragmentContainer.innerHTML = content.trim();
		const importedBlocks = fragmentContainer.querySelectorAll('[data-bge-container]');

		container.after(...importedBlocks);
		container.remove();
	}
}
