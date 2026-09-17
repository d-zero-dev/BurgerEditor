#!/usr/bin/env node
// React Compilerはコンパイル対象外の判断を診断ログなしで下すことがある
// （createItem()のEditorがオブジェクトメソッド省略記法だとコンポーネント
// として一切認識しない、等）。この検証を「一度手元でbabelのloggerオプション
// を使って確認した」という一回限りの手順で終わらせず、blocks配下の各item
// Editorに対して直接babelを通し、コンパイル状態が期待どおりかをコードとして
// 固定する。
//
// 使い方: node scripts/check-react-compiler-coverage.mjs
//
// 既知の限界: ファイル単位で`react/compiler-runtime`の有無を見ているため、
// ファイル内に「使われていない別の関数」がコンパイル対象になった場合、
// 実際に使われているEditor自体が非対象でも見逃しうる。この盲点は
// eslint.config.jsのno-restricted-syntaxルール（Editorのオブジェクト
// メソッド省略記法を禁止）が実質的にカバーしている

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import babel from '@babel/core';

const here = path.dirname(fileURLToPath(import.meta.url));
const itemsDir = path.resolve(here, '../packages/@burger-editor/blocks/src/items');

// image/editor.tsxのみ、_updateImage内のtry/catch/finallyがbabel-plugin-
// react-compiler 1.0.0の既知の未対応（"(BuildHIR::lowerStatement) Handle
// TryStatement with a finalizer"）に抵触し、意図的にコンパイル対象外。
// アップストリームでfinally対応が入ったらこのファイルも自動的にコンパイル
// されるようになるはずで、そのときはこのSetから外すこと（このスクリプトが
// 「期待通りコンパイルされるようになった」として検知する）
const EXPECTED_UNCOMPILED = new Set(['image/editor.tsx']);

/**
 * @returns {{ rel: string, abs: string }[]}
 */
function findItemEditorFiles() {
	const files = [];
	for (const entry of readdirSync(itemsDir, { withFileTypes: true })) {
		if (!entry.isDirectory() || entry.name.startsWith('_')) {
			continue;
		}
		const editorPath = path.join(itemsDir, entry.name, 'editor.tsx');
		const indexPath = path.join(itemsDir, entry.name, 'index.tsx');
		if (existsSync(editorPath)) {
			files.push({ rel: `${entry.name}/editor.tsx`, abs: editorPath });
		} else if (existsSync(indexPath)) {
			files.push({ rel: `${entry.name}/index.tsx`, abs: indexPath });
		}
	}
	return files;
}

let failed = false;

for (const { rel, abs } of findItemEditorFiles()) {
	const code = readFileSync(abs, 'utf8');
	const result = babel.transformSync(code, {
		filename: abs,
		presets: ['@babel/preset-typescript'],
		plugins: ['babel-plugin-react-compiler'],
		babelrc: false,
		configFile: false,
	});
	const compiled = result?.code?.includes('react/compiler-runtime') ?? false;
	const expectedUncompiled = EXPECTED_UNCOMPILED.has(rel);

	if (compiled === expectedUncompiled) {
		failed = true;
		console.error(
			compiled
				? `UNEXPECTEDLY COMPILED: ${rel}（EXPECTED_UNCOMPILEDから外し忘れていないか確認）`
				: `UNEXPECTEDLY NOT COMPILED: ${rel}（新たなバイルアウト条件を持ち込んでいないか確認）`,
		);
	} else {
		console.log(`${compiled ? 'compiled' : 'not compiled (expected)'}: ${rel}`);
	}
}

process.exit(failed ? 1 : 0);
