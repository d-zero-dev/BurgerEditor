#!/usr/bin/env node
// 正式版を 1 つも公開していないパッケージだけ、npm の `latest` を公開した版に
// 動かす。`publish.yml` が prerelease を `alpha` などのタグで公開すると、
// そのパッケージの `latest` は最初に公開された古い版のまま残り、バージョン指定
// なしの install が古い版を取り込んでしまう（`latest` は削除できず、タグなしで
// の公開もできない）。
//
// 正式版を持つパッケージ（v3 と v4 の両方にあるもの）は触らない。`latest` は
// v3 の正式版が占めており、v4 の正式版が出るまで動かさないため。
//
// 使い方: node scripts/follow-latest-dist-tag.mjs [--dry-run]
//   `publish.yml` が publish の後に実行する。現在の版は lerna.json から読む。
//   正式版の公開では `lerna publish --dist-tag latest` が `latest` を動かすので
//   何もしない。
//
// `npm dist-tag add` は Trusted Publishing の OIDC で認証する。パッケージごとの
// 設定で「Allow npm dist-tag」を有効にしておく必要がある。動かせなかった
// パッケージがあれば、ワークフローを失敗させて気づけるようにする（publish は
// 済んでいるので、再実行で直せる）。

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * @param {readonly string[]} versions 公開済みの版
 * @returns {boolean} 正式版（prerelease 識別子のない版）を 1 つでも持つか
 * @example
 * hasStableVersion(['4.0.0-alpha.1']); // false
 * hasStableVersion(['3.5.0', '4.0.0-alpha.1']); // true
 */
export function hasStableVersion(versions) {
	return versions.some((version) => !version.includes('-'));
}

/**
 * @param {readonly { name: string, versions: readonly string[] }[]} packages
 * @returns {string[]} `latest` を動かすパッケージ名
 * @example
 * packagesToFollow([{ name: 'a', versions: ['1.0.0-alpha.1'] }]); // ['a']
 */
export function packagesToFollow(packages) {
	return packages
		.filter(({ versions }) => !hasStableVersion(versions))
		.map(({ name }) => name);
}

/**
 * @param {string} root リポジトリのルート
 * @returns {string[]} 公開対象（private でない）パッケージ名
 */
function listPublicPackageNames(root) {
	const scope = path.join(root, 'packages/@burger-editor');
	const names = [];
	for (const entry of readdirSync(scope, { withFileTypes: true })) {
		const manifest = path.join(scope, entry.name, 'package.json');
		if (!entry.isDirectory() || !existsSync(manifest)) {
			continue;
		}
		const json = JSON.parse(readFileSync(manifest, 'utf8'));
		if (!json.private) {
			names.push(json.name);
		}
	}
	return names;
}

/**
 * @param {string} name
 * @returns {string[]} レジストリに公開されている全バージョン
 */
function publishedVersions(name) {
	const output = execFileSync('npm', ['view', name, 'versions', '--json'], {
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
	});
	const parsed = JSON.parse(output);
	return Array.isArray(parsed) ? parsed : [parsed];
}

/**
 * 全パッケージの公開済みバージョンを読む。読めなかったパッケージ（通信エラー
 * など）は、正式版の有無が分からないので動かさず、`failed` に入れて呼び出し側が
 * 失敗として報告する。E404 も失敗として扱う: このスクリプトは publish の後に
 * 走るので、公開対象のパッケージがレジストリにないのは異常で、「バージョン
 * なし」と見なすと、一時的な 404 で、正式版のあるパッケージの `latest` を
 * prerelease に動かしてしまう。
 * @param {readonly string[]} names
 * @param {(name: string) => string[]} view 公開済みバージョンを返す（失敗時は例外）
 * @returns {{ packages: { name: string, versions: string[] }[], failed: string[] }}
 * @example
 * collectPackages(['a'], () => ['1.0.0-alpha.1']).packages; // [{ name: 'a', versions: ['1.0.0-alpha.1'] }]
 */
export function collectPackages(names, view) {
	const packages = [];
	const failed = [];
	for (const name of names) {
		try {
			packages.push({ name, versions: view(name) });
		} catch (error) {
			const output = String(error?.stderr ?? error?.message ?? '');
			console.error(`Could not read the versions of ${name}: ${output.trim()}`);
			failed.push(name);
		}
	}
	return { packages, failed };
}

/**
 * @param {readonly string[]} argv
 * @returns {number} 終了コード
 */
function main(argv) {
	const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
	const dryRun = argv.includes('--dry-run');
	const { version } = JSON.parse(readFileSync(path.join(root, 'lerna.json'), 'utf8'));

	if (!version.includes('-')) {
		console.log(`${version} is a stable release; latest was set by the publish itself.`);
		return 0;
	}

	const { packages, failed } = collectPackages(
		listPublicPackageNames(root),
		publishedVersions,
	);

	for (const name of packagesToFollow(packages)) {
		const target = `${name}@${version}`;
		// 部分的な publish（一部のパッケージだけ公開できた）の後は、公開されていない
		// 版へ `latest` を動かそうとして npm が失敗する。理由が分かる形で失敗に数える
		if (!packages.find((entry) => entry.name === name)?.versions.includes(version)) {
			console.error(`${target} is not on the registry (a partial publish?)`);
			failed.push(name);
			continue;
		}
		console.log(`${dryRun ? '[dry-run] ' : ''}npm dist-tag add ${target} latest`);
		if (dryRun) {
			continue;
		}
		try {
			execFileSync('npm', ['dist-tag', 'add', target, 'latest'], { stdio: 'inherit' });
		} catch {
			failed.push(name);
		}
	}

	if (failed.length > 0) {
		console.error(
			`Could not move latest (or read the versions) for: ${failed.join(', ')}`,
		);
		return 1;
	}
	return 0;
}

// 実体のパスで比べる。`process.argv[1]` はシンボリックリンクを通ったパスのことが
// あり（macOS の /var → /private/var など）、`import.meta.url` は実体のパスなので、
// 単純比較では、起動したのに何も実行されない
if (process.argv[1] && fileURLToPath(import.meta.url) === realpathSync(process.argv[1])) {
	process.exit(main(process.argv.slice(2)));
}
