#!/usr/bin/env node
// ARCHITECTURE.md の依存グラフ（mermaid）が、各パッケージの package.json と
// 一致しているかを検査する。手書きの図は依存を足し引きしたときに更新が
// 漏れやすく、図が古いまま「依存してよい向き」の根拠として読まれてしまう。
// 正は package.json とし、図との差分を CI で落とす。
//
// 使い方: node scripts/check-architecture-graph.mjs
//
// 対象とする辺:
//   packages/@burger-editor/* の dependencies / peerDependencies に現れる
//   @burger-editor/* パッケージ。devDependencies（テスト用ハーネス等）は
//   実行時の依存ではないため図に描かない。ただし lerna はビルド順を
//   devDependencies も含めて決めるため、図の向きを逆流させる（図の依存先から
//   依存元へたどり着ける）devDependency はビルド順の循環になるので落とす。
//
// package.json の無いディレクトリ（ブランチ切り替え後に残った node_modules
// だけのディレクトリ等）はパッケージではないので読み飛ばす。
//
// 図の書式:
//   `A --> B` は「A が B に依存する」。ノード ID はパッケージ名から
//   ハイフンを除いたもの（`custom-element` → `customelement`）。mermaid は
//   ID 中のハイフンを辺の記号と解釈しうるため。

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const packagesDir = path.join(root, 'packages/@burger-editor');
const architecturePath = path.join(root, 'ARCHITECTURE.md');

const SCOPE = '@burger-editor/';

/**
 * @param {string} name パッケージ名（スコープなし）
 * @returns {string} mermaid のノード ID
 */
const toId = (name) => name.replaceAll('-', '');

/** @type {Set<string>} `A --> B` 形式（ノード ID） */
const expected = new Set();
/** @type {Set<string>} */
const packageIds = new Set();
/** @type {Map<string, Set<string>>} 実行時の依存（図に描く辺）の隣接リスト */
const runtimeGraph = new Map();
/** @type {Array<[string, string]>} devDependencies の辺 */
const devEdges = [];

for (const dir of readdirSync(packagesDir, { withFileTypes: true })) {
	if (!dir.isDirectory()) {
		continue;
	}
	const packageJsonPath = path.join(packagesDir, dir.name, 'package.json');
	if (!existsSync(packageJsonPath)) {
		continue;
	}
	const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
	const from = toId(pkg.name.slice(SCOPE.length));
	packageIds.add(from);
	const targets = new Set();
	runtimeGraph.set(from, targets);
	const deps = { ...pkg.peerDependencies, ...pkg.dependencies };
	for (const dep of Object.keys(deps)) {
		if (dep.startsWith(SCOPE)) {
			const to = toId(dep.slice(SCOPE.length));
			targets.add(to);
			expected.add(`${from} --> ${to}`);
		}
	}
	for (const dep of Object.keys(pkg.devDependencies ?? {})) {
		if (dep.startsWith(SCOPE) && !(dep in deps)) {
			devEdges.push([from, toId(dep.slice(SCOPE.length))]);
		}
	}
}

/**
 * @param {string} start
 * @param {string} goal
 * @returns {boolean} 実行時の依存をたどって start から goal に届くか
 */
const reaches = (start, goal) => {
	const seen = new Set();
	const stack = [start];
	while (stack.length > 0) {
		const current = stack.pop();
		if (current === goal) {
			return true;
		}
		if (seen.has(current)) {
			continue;
		}
		seen.add(current);
		stack.push(...(runtimeGraph.get(current) ?? []));
	}
	return false;
};

const markdown = readFileSync(architecturePath, 'utf8');
const block = /```mermaid\n([\s\S]*?)```/.exec(markdown);
if (!block) {
	console.error('ARCHITECTURE.md に mermaid の依存グラフがありません');
	process.exit(1);
}

/** @type {Set<string>} */
const actual = new Set();
/** @type {Set<string>} */
const declaredIds = new Set();
for (const line of block[1].split('\n')) {
	const edge = /^\s*(\w+)\s*-->\s*(\w+)\s*$/.exec(line);
	if (edge) {
		actual.add(`${edge[1]} --> ${edge[2]}`);
		continue;
	}
	const node = /^\s*(\w+)\[/.exec(line);
	if (node) {
		declaredIds.add(node[1]);
	}
}

let failed = false;

for (const edge of [...expected].toSorted()) {
	if (!actual.has(edge)) {
		failed = true;
		console.error(`MISSING EDGE: ${edge}（package.json にあるが図にない）`);
	}
}
for (const edge of [...actual].toSorted()) {
	if (!expected.has(edge)) {
		failed = true;
		console.error(`EXTRA EDGE: ${edge}（図にあるが package.json にない）`);
	}
}
for (const id of [...packageIds].toSorted()) {
	if (!declaredIds.has(id)) {
		failed = true;
		console.error(`MISSING NODE: ${id}（パッケージがあるが図にない）`);
	}
}
for (const id of [...declaredIds].toSorted()) {
	if (!packageIds.has(id)) {
		failed = true;
		console.error(`EXTRA NODE: ${id}（図にあるがパッケージがない）`);
	}
}
for (const [from, to] of devEdges.toSorted(([a], [b]) => a.localeCompare(b))) {
	if (reaches(to, from)) {
		failed = true;
		console.error(
			`REVERSED DEV EDGE: ${from} --> ${to}（devDependencies が図の向きを逆流し、ビルド順が循環する）`,
		);
	}
}

if (!failed) {
	console.log(
		`ok: ARCHITECTURE.md の依存グラフは package.json と一致しています（${expected.size} 辺）`,
	);
}

process.exit(failed ? 1 : 0);
