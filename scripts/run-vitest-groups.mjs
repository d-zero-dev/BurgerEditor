#!/usr/bin/env node
// Vitest のプロジェクトを scripts/vitest-project-groups.js のグループ単位で、
// グループごとに別の `vitest run` プロセスとして順に実行する。全プロジェクトを
// 1プロセスで走らせると Chromium が run 終了まで解放されず、ローカル Docker の
// メモリ上限で落ちるため（#997。詳細は vitest-project-groups.js の JSDoc）。
//
// 使い方（yarn test / yarn test:unit から呼ばれる）:
//   yarn test:unit                              全プロジェクトをグループ単位で実行
//   yarn test:unit --project client --project vr 指定プロジェクトをグループ単位で実行
//   yarn test:unit --project core <filter>      上記以外の引数があれば1回の vitest run へそのまま渡す
//
// グループ分けするのは、引数がないか、既知のプロジェクト名を `--project` で
// 指定しただけの場合に限る。ファイルフィルタ・`-t`・ワイルドカードの
// `--project 'local*'` などを含む呼び出しは絞り込み実行とみなし、Vitest の
// 解釈（「No test files found」での失敗を含む）をそのまま使う。グループごとに
// 同じフィルタを渡すと、該当ファイルのないグループを失敗にしないために
// `--passWithNoTests` が必要になり、どこにも一致しないフィルタの誤りまで
// 成功扱いになるため。
//
// メモリに余裕のある CI でも同じ経路を通す。CI だけ1プロセスにすると、
// ローカルと CI でテストの実行単位（同じプロセスに同居するプロジェクト）が
// 食い違い、片方でだけ起きる不具合を生むため。グループ化で増える起動
// コストはグループあたり数秒程度。
//
// あるグループが失敗しても残りのグループは実行し、最後に失敗したグループを
// まとめて報告する。

import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

import { VITEST_PROJECT_GROUPS } from './vitest-project-groups.js';

// yarn run の外（node で直接起動など）でも node_modules/.bin の PATH に
// 依存せず起動できるよう、vitest の bin を解決して現在の Node で実行する
const require = createRequire(import.meta.url);
const vitestBin = path.join(
	path.dirname(require.resolve('vitest/package.json')),
	'vitest.mjs',
);

/**
 * @param {string[]} args - `vitest` に渡す引数
 * @returns {boolean} 正常終了したか
 */
function runVitest(args) {
	console.log(`\n[run-vitest-groups] vitest ${args.join(' ')}\n`);
	const result = spawnSync(process.execPath, [vitestBin, ...args], { stdio: 'inherit' });
	if (result.error) {
		console.error(result.error);
		return false;
	}
	return result.status === 0;
}

/**
 * 引数が「既知プロジェクト名の `--project` 指定だけ」から成るなら、その
 * プロジェクト名の集合を返す。引数がなければ空集合、それ以外の引数を含めば null。
 * @param {string[]} argv
 * @param {Set<string>} known
 * @returns {Set<string> | null}
 */
function parseProjectsOnly(argv, known) {
	const projects = new Set();
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		const name =
			arg === '--project'
				? argv[++i]
				: arg.startsWith('--project=')
					? arg.slice(10)
					: null;
		if (name === null || name === undefined || !known.has(name)) {
			return null;
		}
		projects.add(name);
	}
	return projects;
}

const argv = process.argv.slice(2);
const requested = parseProjectsOnly(argv, new Set(VITEST_PROJECT_GROUPS.flat()));

if (requested === null) {
	process.exit(runVitest(['run', ...argv]) ? 0 : 1);
}

const failed = [];
for (const group of VITEST_PROJECT_GROUPS) {
	const selected =
		requested.size > 0 ? group.filter((name) => requested.has(name)) : group;
	if (selected.length === 0) {
		continue;
	}
	if (!runVitest(['run', ...selected.flatMap((name) => ['--project', name])])) {
		failed.push(selected.join(', '));
	}
}

if (failed.length > 0) {
	console.error(
		`\n[run-vitest-groups] failed groups:\n${failed.map((g) => `  - ${g}`).join('\n')}`,
	);
	process.exit(1);
}
