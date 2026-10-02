#!/usr/bin/env node
// @burger-editor/blocks のルートエントリ（dist/index.js）は、Node.js
// （file-io / cli / mcp-server）とユーザーの burgereditor.config.js から
// 読み込まれる。ここから React や @burger-editor/client が辿れると、peer
// 依存を自動導入しない環境で「Cannot find package 'react'」により起動時に
// 落ちる。モノレポ内はルートの devDependencies に React があるため、
// この問題は通常のテストでは検出できない。ビルド成果物の import グラフを
// 直接検査して、境界をコードとして固定する。
//
// 使い方: yarn build && node scripts/check-blocks-entry-boundary.mjs
//
// 検査内容:
//   1. dist/index.js から相対 import で辿れる全チャンクの bare specifier に
//      react / react-dom / @burger-editor/client が含まれないこと
//   2. dist/editor.js は @burger-editor/client/ui を import していること
//      （検査1が空振りしていないことの確認。Editor が dist/index.js 側へ
//      移ってしまった場合もここで検知する）

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(here, '../packages/@burger-editor/blocks/dist');

const FORBIDDEN = /^(?:react|react-dom|@burger-editor\/client)(?:\/|$)/;

// `import x from 'a'` / `import 'a'` / `export * from 'a'` / `import('a')`
const SPECIFIER = /(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)(['"])([^'"]+)\1/g;

/**
 * エントリから相対 import で辿れる全ファイルの bare specifier を集める。
 * @param {string} entry
 * @returns {Map<string, string>} specifier → 最初に参照したファイル（distDir 相対）
 */
function collectBareSpecifiers(entry) {
	const bare = new Map();
	const visited = new Set();
	const queue = [entry];
	while (queue.length > 0) {
		const file = queue.shift();
		if (!file || visited.has(file)) {
			continue;
		}
		visited.add(file);
		const code = readFileSync(file, 'utf8');
		for (const match of code.matchAll(SPECIFIER)) {
			const specifier = match[2];
			if (specifier.startsWith('.')) {
				queue.push(path.resolve(path.dirname(file), specifier));
			} else if (!bare.has(specifier)) {
				bare.set(specifier, path.relative(distDir, file));
			}
		}
	}
	return bare;
}

const indexPath = path.join(distDir, 'index.js');
const editorPath = path.join(distDir, 'editor.js');

for (const file of [indexPath, editorPath]) {
	if (!existsSync(file)) {
		console.error(
			`${path.relative(process.cwd(), file)} がありません。先に yarn build を実行してください`,
		);
		process.exit(1);
	}
}

let failed = false;

for (const [specifier, from] of collectBareSpecifiers(indexPath)) {
	if (FORBIDDEN.test(specifier)) {
		failed = true;
		console.error(
			`FORBIDDEN IMPORT: dist/index.js から辿れる ${from} が '${specifier}' を import しています（Node.js 側で読み込まれるルートエントリに UI 依存を持ち込まないこと）`,
		);
	}
}

if (!collectBareSpecifiers(editorPath).has('@burger-editor/client/ui')) {
	failed = true;
	console.error(
		"dist/editor.js が '@burger-editor/client/ui' を import していません（検査対象が想定とずれています）",
	);
}

if (!failed) {
	console.log(
		'ok: blocks のルートエントリは react / react-dom / @burger-editor/client に依存しません',
	);
}

process.exit(failed ? 1 : 0);
