import type { SearchParams } from './css-variable-matcher.js';

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { test, expect, describe, beforeAll, afterAll, afterEach, vi } from 'vitest';

import { scanHtmlFiles, scanHtmlFilesWithMultipleQueries } from './html-file-scanner.js';

/**
 * `exportStyleOptions` が読む `--bge-options-*` を持つ `data-bge-container` を
 * 1行1要素で並べた最小のHTML。行番号を期待値にハードコードできるよう、
 * 各要素の行位置を固定している
 */
const INDEX_HTML = [
	'<!doctype html>',
	'<html>',
	'<body>',
	'<div data-bge-container="grid" style="--bge-options-margin: var(--bge-options-margin--none); --bge-options-bg-color: var(--bge-options-bg-color--blue);"></div>',
	'<div data-bge-container="grid" style="--bge-options-margin: var(--bge-options-margin--large);"></div>',
	'<div data-bge-container="grid" style="--bge-options-width: var(--bge-options-width--wide);"></div>',
	'</body>',
	'</html>',
].join('\n');

const NESTED_HTML =
	'<div data-bge-container="grid" style="--bge-options-margin: var(--bge-options-margin--none);"></div>\n';

/**
 *
 * @param category
 * @param values
 */
function query(category: string, values: readonly string[]): SearchParams {
	const isWildcard = values.length === 1 && values[0] === '*';
	return {
		category,
		values,
		isWildcard,
		originalQuery: `${category}=${values.join(',')}`,
	};
}

describe('html-file-scanner', () => {
	let documentRoot: string;

	beforeAll(async () => {
		documentRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bge-inspector-'));
		await fs.mkdir(path.join(documentRoot, 'sub'));
		await fs.mkdir(path.join(documentRoot, '.cache'));
		await fs.writeFile(path.join(documentRoot, 'index.html'), INDEX_HTML);
		await fs.writeFile(path.join(documentRoot, 'sub', 'page.html'), NESTED_HTML);
		// 隠しディレクトリ配下と.html以外はスキャン対象外
		await fs.writeFile(path.join(documentRoot, '.cache', 'hidden.html'), NESTED_HTML);
		await fs.writeFile(path.join(documentRoot, 'notes.txt'), NESTED_HTML);
	});

	afterAll(async () => {
		await fs.rm(documentRoot, { recursive: true, force: true });
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	/**
	 * 結果の並びを保ったまま、documentRoot相対パスの`path:line`に正規化して返す
	 * @param matches
	 */
	function locations(matches: readonly { filePath: string; lineNumber: number }[]) {
		return matches.map(
			(m) => `${path.relative(documentRoot, m.filePath)}:${m.lineNumber}`,
		);
	}

	/**
	 * `fs.readdir` の返却順を逆順にして、ファイルシステム依存の順序を再現する
	 */
	function reverseReaddirOrder() {
		const original = fs.readdir.bind(fs) as (...args: unknown[]) => Promise<unknown[]>;
		vi.spyOn(fs, 'readdir').mockImplementation((async (...args: unknown[]) => {
			const entries = await original(...args);
			return entries.toReversed();
		}) as unknown as typeof fs.readdir);
	}

	describe('scanHtmlFiles', () => {
		test('指定した値に一致する要素のファイルと行番号を返す', async () => {
			const matches = await scanHtmlFiles(documentRoot, query('margin', ['none']));

			expect(locations(matches)).toEqual([
				'index.html:4',
				path.join('sub', 'page.html') + ':1',
			]);
		});

		test('ワイルドカードはそのカテゴリを持つ全要素に一致する', async () => {
			const matches = await scanHtmlFiles(documentRoot, query('margin', ['*']));

			expect(locations(matches)).toEqual([
				'index.html:4',
				'index.html:5',
				path.join('sub', 'page.html') + ':1',
			]);
		});

		test('カンマ区切りのOR条件はいずれかの値に一致すれば拾う', async () => {
			const matches = await scanHtmlFiles(
				documentRoot,
				query('margin', ['none', 'large']),
			);

			expect(locations(matches)).toEqual([
				'index.html:4',
				'index.html:5',
				path.join('sub', 'page.html') + ':1',
			]);
		});

		test('一致する要素がなければ空配列を返す', async () => {
			const matches = await scanHtmlFiles(documentRoot, query('nonexistent', ['value']));

			expect(matches).toEqual([]);
		});

		test('隠しディレクトリ配下のHTMLと.html以外のファイルは走査しない', async () => {
			const matches = await scanHtmlFiles(documentRoot, query('margin', ['none']));

			const files = matches.map((m) => path.relative(documentRoot, m.filePath));
			expect(files).not.toContain(path.join('.cache', 'hidden.html'));
			expect(files).not.toContain('notes.txt');
		});

		test('lineContentは該当要素のstyle属性を返す', async () => {
			const matches = await scanHtmlFiles(documentRoot, query('margin', ['large']));

			expect(matches).toHaveLength(1);
			expect(matches[0]?.lineContent).toBe(
				'--bge-options-margin: var(--bge-options-margin--large);',
			);
		});

		test('readdirの返却順に依存せず、ファイルパス→文書内の出現順で返す', async () => {
			reverseReaddirOrder();

			const matches = await scanHtmlFiles(documentRoot, query('margin', ['*']));

			expect(locations(matches)).toEqual([
				'index.html:4',
				'index.html:5',
				path.join('sub', 'page.html') + ':1',
			]);
		});

		test('存在しないdocumentRootは例外を投げる', async () => {
			await expect(
				scanHtmlFiles(path.join(documentRoot, 'missing'), query('margin', ['none'])),
			).rejects.toThrow('ENOENT');
		});
	});

	describe('scanHtmlFilesWithMultipleQueries', () => {
		test('全条件を満たす1つの要素だけを返す（AND）', async () => {
			const matches = await scanHtmlFilesWithMultipleQueries(documentRoot, [
				query('margin', ['none']),
				query('bg-color', ['blue']),
			]);

			// sub/page.html の要素はmargin=noneだがbg-colorを持たないので含まれない
			expect(locations(matches)).toEqual(['index.html:4']);
		});

		test('条件が1つのときはscanHtmlFilesと同じ結果になる', async () => {
			const matches = await scanHtmlFilesWithMultipleQueries(documentRoot, [
				query('margin', ['none']),
			]);

			expect(locations(matches)).toEqual([
				'index.html:4',
				path.join('sub', 'page.html') + ':1',
			]);
		});

		test('全条件を満たす要素がなければ空配列を返す', async () => {
			const matches = await scanHtmlFilesWithMultipleQueries(documentRoot, [
				query('margin', ['none']),
				query('nonexistent', ['value']),
			]);

			expect(matches).toEqual([]);
		});

		test('readdirの返却順に依存せず、ファイルパス→文書内の出現順で返す', async () => {
			reverseReaddirOrder();

			const matches = await scanHtmlFilesWithMultipleQueries(documentRoot, [
				query('margin', ['*']),
				query('margin', ['none', 'large']),
			]);

			expect(locations(matches)).toEqual([
				'index.html:4',
				'index.html:5',
				path.join('sub', 'page.html') + ':1',
			]);
		});

		test('条件が空配列なら空配列を返す', async () => {
			const matches = await scanHtmlFilesWithMultipleQueries(documentRoot, []);

			expect(matches).toEqual([]);
		});

		test('同じ要素が複数条件に一致しても1要素につき1件だけ返す', async () => {
			const matches = await scanHtmlFilesWithMultipleQueries(documentRoot, [
				query('margin', ['*']),
				query('bg-color', ['*']),
			]);

			expect(locations(matches)).toEqual(['index.html:4']);
		});
	});
});
