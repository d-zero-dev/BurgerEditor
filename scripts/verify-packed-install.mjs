#!/usr/bin/env node
// 公開パッケージを `yarn pack` した tarball だけから、React 未導入の空
// ディレクトリへインストールし、利用者向けの bin が起動することを検証する。
//
// モノレポ内はルートの devDependencies に React などがあり、ワークスペース
// 間の依存もシンボリックリンクで解決されるため、公開物の `exports` /
// `files` / `dependencies` / `peerDependencies` の過不足は通常のテストでは
// 検出できない（#963: blocks のルートが react を import していた不具合）。
// check-blocks-entry-boundary.mjs はビルド成果物の import グラフを静的に
// 見るだけで、実インストール後の解決までは見ない。
//
// 使い方: yarn build && node scripts/verify-packed-install.mjs
//
// 検査内容（いずれも peer 依存を自動導入しない node-modules 環境）:
//   0. 検証環境に react / react-dom が入っていないこと（空振り防止）
//   1. @burger-editor/cli: `catalog-list` が blocks のルートを import する
//      設定ファイルを読んで exit 0 で完了する
//   2. @burger-editor/local (`bge`): 起動バナーを出す
//   3. @burger-editor/mcp-server (`bge-mcp-server`): stdio で ready になる
//
// 内部パッケージ（@burger-editor/*）は resolutions で pack した tarball に
// 固定する。レジストリ上の旧版が混ざると、検証対象が今の変更ではなくなる
// （lerna の内部依存ズレ時に起きる）ため。

import { spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripVTControlCharacters } from 'node:util';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scope = path.join(root, 'packages/@burger-editor');

const rootPackageJson = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));

/** 利用者が直接インストールするパッケージ（残りは推移的に引かれる） */
const ENTRY_PACKAGES = [
	'@burger-editor/cli',
	'@burger-editor/local',
	'@burger-editor/mcp-server',
];

/**
 * 子プロセスを実行して終了を待つ。
 * @param {string} command
 * @param {readonly string[]} args
 * @param {object} options
 * @param {string} options.cwd
 * @param {RegExp} [options.until] stdout / stderr がこれに一致したら kill する（終了しないサーバー用）
 * @param {number} [options.timeoutMs]
 * @returns {Promise<{ code: number | null, stdout: string, stderr: string, matched: boolean, timedOut: boolean }>}
 */
function exec(command, args, { cwd, until, timeoutMs = 120_000 }) {
	return new Promise((resolve, reject) => {
		const env = { ...process.env, DOTENV_CONFIG_QUIET: 'true' };
		// 開発者のシェルに残った値が検証対象の挙動を上書きしないようにする
		delete env.BGE_CONFIG;
		delete env.DEV_MODE;
		// 親の yarn が `yarn run` 経由で設定する値を引き継ぐと、tmp 側の
		// プロジェクトではなくモノレポを参照してしまう
		for (const key of Object.keys(env)) {
			if (key.startsWith('YARN_') || key.startsWith('npm_') || key === 'INIT_CWD') {
				delete env[key];
			}
		}
		const child = spawn(command, args, { cwd, env });
		let stdout = '';
		let stderr = '';
		let matched = false;
		let timedOut = false;
		const timer = setTimeout(() => {
			timedOut = true;
			child.kill();
		}, timeoutMs);
		const onData = () => {
			if (!matched && until?.test(stripVTControlCharacters(stdout + stderr))) {
				matched = true;
				child.kill();
			}
		};
		child.stdout.on('data', (chunk) => {
			stdout += chunk.toString('utf8');
			onData();
		});
		child.stderr.on('data', (chunk) => {
			stderr += chunk.toString('utf8');
			onData();
		});
		child.on('error', (error) => {
			clearTimeout(timer);
			reject(error);
		});
		child.on('close', (code) => {
			clearTimeout(timer);
			resolve({
				code,
				stdout: stripVTControlCharacters(stdout),
				stderr: stripVTControlCharacters(stderr),
				matched,
				timedOut,
			});
		});
		child.stdin.end();
	});
}

/**
 * @returns {{ name: string, dir: string }[]} 公開対象（private でない）ワークスペース
 */
function listPublicPackages() {
	const packages = [];
	for (const entry of readdirSync(scope, { withFileTypes: true })) {
		const dir = path.join(scope, entry.name);
		const manifest = path.join(dir, 'package.json');
		if (!entry.isDirectory() || !existsSync(manifest)) {
			continue;
		}
		const json = JSON.parse(readFileSync(manifest, 'utf8'));
		if (!json.private) {
			packages.push({ name: json.name, dir });
		}
	}
	return packages;
}

const failures = [];

/**
 * @param {string} label
 * @param {boolean} ok
 * @param {string} [detail] 失敗時に添える出力
 */
function check(label, ok, detail = '') {
	if (ok) {
		console.log(`ok: ${label}`);
		return;
	}
	failures.push(label);
	console.error(`FAILED: ${label}`);
	if (detail) {
		console.error(detail.replaceAll(/^/gm, '    '));
	}
}

const tmp = await mkdtemp(path.join(tmpdir(), 'bge-packed-install-'));

try {
	const tarballDir = path.join(tmp, 'tarballs');
	const project = path.join(tmp, 'project');
	await mkdir(tarballDir);
	await mkdir(path.join(project, 'src'), { recursive: true });

	// pack
	const tarballs = new Map();
	for (const { name } of listPublicPackages()) {
		const file = path.join(tarballDir, `${name.replace(/^@/, '').replace('/', '-')}.tgz`);
		const result = await exec('yarn', ['workspace', name, 'pack', '--out', file], {
			cwd: root,
		});
		if (result.code !== 0) {
			throw new Error(
				`yarn pack に失敗しました: ${name}\n${result.stdout}${result.stderr}`,
			);
		}
		tarballs.set(name, file);
	}
	for (const name of ENTRY_PACKAGES) {
		if (!tarballs.has(name)) {
			throw new Error(`${name} が公開対象のワークスペースにありません`);
		}
	}

	// 空プロジェクトを作って tarball だけからインストールする
	const fileSpec = (name) => `file:${tarballs.get(name)}`;
	await writeFile(
		path.join(project, 'package.json'),
		JSON.stringify(
			{
				name: 'bge-packed-install-smoke',
				private: true,
				type: 'module',
				packageManager: rootPackageJson.packageManager,
				dependencies: Object.fromEntries(ENTRY_PACKAGES.map((n) => [n, fileSpec(n)])),
				resolutions: Object.fromEntries(
					[...tarballs.keys()].map((n) => [n, fileSpec(n)]),
				),
			},
			null,
			'\t',
		),
	);
	// lockfile を作る初回 install を CI の immutable 既定で拒否させない。
	// peer を自動導入しない node-modules を明示する（モノレポと同じ設定）
	await writeFile(
		path.join(project, '.yarnrc.yml'),
		'nodeLinker: node-modules\nenableImmutableInstalls: false\nenableScripts: false\n',
	);
	await writeFile(path.join(project, 'yarn.lock'), '');

	const install = await exec('yarn', ['install'], { cwd: project, timeoutMs: 300_000 });
	if (install.code !== 0) {
		throw new Error(`yarn install に失敗しました\n${install.stdout}${install.stderr}`);
	}

	// 利用者の設定ファイルは blocks のルートを import する（#963 の再現条件）
	await writeFile(path.join(project, 'src/index.html'), '<div class="content"></div>\n');
	await writeFile(
		path.join(project, 'burgereditor.config.mjs'),
		`import { defaultCatalog } from '@burger-editor/blocks';
export default {
	documentRoot: './src',
	assetsRoot: './src',
	editableArea: '.content',
	catalog: defaultCatalog,
	newFileContent: '<div class="content"></div>',
	port: 0,
	host: '127.0.0.1',
	open: false,
	agent: { enabled: false },
};
`,
	);

	// 0. 空振り防止
	const modules = path.join(project, 'node_modules');
	check(
		'検証環境に react / react-dom がインストールされていない',
		!existsSync(path.join(modules, 'react')) &&
			!existsSync(path.join(modules, 'react-dom')),
		'peer 依存が自動導入されると、React 未導入環境の検証になりません',
	);
	const registryResolved = readFileSync(path.join(project, 'yarn.lock'), 'utf8')
		.split('\n')
		.filter((line) => /^\s+resolution: "@burger-editor\/[^"]+@npm:/.test(line));
	check(
		'内部パッケージがレジストリではなく pack した tarball から導入されている',
		registryResolved.length === 0,
		registryResolved.join('\n'),
	);

	// 1. cli
	const cli = await exec(
		process.execPath,
		[path.join(modules, '@burger-editor/cli/dist/bin.js'), 'catalog-list'],
		{ cwd: project, timeoutMs: 30_000 },
	);
	let catalogs = [];
	try {
		catalogs = JSON.parse(cli.stdout).catalogs ?? [];
	} catch {
		// 失敗は下の check で出力付きで報告する
	}
	check(
		'@burger-editor/cli: catalog-list が起動して標準カタログを返す',
		cli.code === 0 && catalogs.length > 0,
		`exit=${cli.code}\n${cli.stdout}${cli.stderr}`,
	);

	// 2. bge
	const bge = await exec(
		process.execPath,
		[path.join(modules, '@burger-editor/local/server/index.js')],
		{ cwd: project, until: /Enjoy Developing/, timeoutMs: 30_000 },
	);
	check(
		'@burger-editor/local: bge が起動バナーを出す',
		bge.matched,
		`exit=${bge.code} timedOut=${bge.timedOut}\n${bge.stdout}${bge.stderr}`,
	);

	// 3. bge-mcp-server
	const mcp = await exec(
		process.execPath,
		[path.join(modules, '@burger-editor/mcp-server/bin/index.js')],
		{ cwd: project, until: /\[burger-editor mcp\] ready on stdio/, timeoutMs: 30_000 },
	);
	check(
		'@burger-editor/mcp-server: bge-mcp-server が stdio で ready になる',
		mcp.matched,
		`exit=${mcp.code} timedOut=${mcp.timedOut}\n${mcp.stdout}${mcp.stderr}`,
	);
} catch (error) {
	failures.push('setup');
	console.error(error instanceof Error ? error.message : String(error));
} finally {
	await rm(tmp, { recursive: true, force: true });
}

if (failures.length > 0) {
	console.error(`\n${failures.length} 件の検査に失敗しました`);
	process.exit(1);
}
console.log('\nok: pack した tarball から React 未導入環境でも全 bin が起動します');
