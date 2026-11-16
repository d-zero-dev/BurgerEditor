#!/usr/bin/env node
// リリースラインごとに、利用者に届く変更が未リリースのまま一定期間残って
// いないかを調べ、残っていれば Issue にして知らせる。判定は report.mjs、
// ラインの定義は scripts/release-lines/lines.mjs。
//
// 使い方: node scripts/release-reminder/index.mjs [--apply] [--now <ISO 8601>]
//   既定は dry-run: レポートと Issue の本文を標準出力（と GitHub Actions の
//   job summary）に出すだけで、Issue には触れない。
//   --apply: Issue を作る・更新する・閉じる（`gh` と `GH_TOKEN` が要る）。
//   --now: 判定の基準時刻（プレビュー用）。
//
// Issue はラインごとに 1 本で、本文の 1 行目のマーカーで見つける。期限を
// 過ぎたときに作り、レポートが変わったときだけ更新し、期限を過ぎていなく
// なったら（リリースされた・変更が取り消された）閉じる。

import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

import { RELEASE_LINES } from '../release-lines/lines.mjs';

import { analyzeLine, issueMarker, renderIssue } from './report.mjs';

/**
 * @param {string[]} args
 * @returns {string}
 */
const git = (args) =>
	execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

/**
 * CI のチェックアウトにはリモート追跡ブランチだけがある。手元ではローカルの
 * ブランチが最新のことがあるので、リモート追跡ブランチを優先して、なければ
 * ローカルを使う。どちらにもなければ null（そのラインは判定せず飛ばす。
 * ラインの期限が切れてブランチを消した後も、他のラインの通知を止めない）。
 * @param {string} branch
 * @returns {string | null}
 */
function resolveRef(branch) {
	for (const candidate of [`origin/${branch}`, branch]) {
		try {
			git(['rev-parse', '--verify', '--quiet', `${candidate}^{commit}`]);
			return candidate;
		} catch {
			// 次の候補へ
		}
	}
	return null;
}

/**
 * @param {string[]} args
 * @param {string} [input]
 * @returns {string}
 */
const gh = (args, input) =>
	execFileSync('gh', args, {
		encoding: 'utf8',
		input,
		stdio: ['pipe', 'pipe', 'inherit'],
	});

/** @type {{ number: number, title: string, body: string }[] | undefined} */
let openIssues;

/**
 * 開いている Issue（Pull Request を除く）を、ページを辿って全件読む。一度だけ
 * 読んで、ライン間で使い回す。件数の上限で打ち切ると、マーカーの付いた Issue
 * を見失い、毎日 Issue を作り直してしまう。
 * @returns {{ number: number, title: string, body: string }[]}
 */
function listOpenIssues() {
	openIssues ??= gh([
		'api',
		'--paginate',
		'repos/{owner}/{repo}/issues?state=open&per_page=100',
		'--jq',
		'.[] | select(.pull_request | not) | {number, title, body: (.body // "")} | tojson',
	])
		.split('\n')
		.filter(Boolean)
		// 画面から編集された Issue の本文は CRLF で返ることがある。1 行目の
		// マーカーと本文の比較が崩れて、毎日 Issue を作り直さないよう揃える
		.map((entry) => {
			const issue = JSON.parse(entry);
			return { ...issue, body: issue.body.replaceAll('\r\n', '\n') };
		});
	return openIssues;
}

/**
 * @param {{ id: string }} line
 * @returns {{ number: number, title: string, body: string } | undefined}
 */
function findOpenIssue(line) {
	return listOpenIssues().find(
		(issue) => issue.body.split('\n')[0] === issueMarker(line),
	);
}

const argv = process.argv.slice(2);
const apply = argv.includes('--apply');
const nowIndex = argv.indexOf('--now');
const now = nowIndex === -1 ? new Date() : new Date(argv[nowIndex + 1]);
if (Number.isNaN(now.getTime())) {
	// 不正な時刻だと期限の判定が常に偽になり、--apply では開いている Issue を
	// 誤って閉じてしまう
	console.error(`--now には ISO 8601 の日時を指定してください: ${argv[nowIndex + 1]}`);
	process.exit(2);
}

const summary = [];
for (const line of RELEASE_LINES.filter((candidate) => candidate.reminder)) {
	const ref = resolveRef(line.branch);
	if (!ref) {
		console.warn(`ブランチ ${line.branch} が見つからないため、${line.id}は判定しません`);
		summary.push(
			`## ${line.id}`,
			'',
			`- ブランチ \`${line.branch}\` が見つからないため判定しませんでした（\`fetch-depth: 0\` でチェックアウトしているか確認してください）`,
			'',
		);
		continue;
	}
	// 公開済みのリリースが、dev への同期の PR が入るまで main にしかタグを持たない
	// 間も、起点を取り違えないように、リリースブランチのタグも数える
	const releaseRef = line.releaseBranch ? resolveRef(line.releaseBranch) : null;
	const report = analyzeLine({ git, ref, releaseRef, line, now });
	const lines = [
		`## ${line.id}（${ref}）`,
		'',
		`- 起点のタグ: ${report.baseline ?? '（タグなし）'}`,
		`- 利用者に届く変更: ${report.changes.length}件`,
		`- 最初の変更が入った日時: ${report.since?.toISOString() ?? '-'}`,
		`- 通知の対象: ${report.due ? 'はい' : 'いいえ'}`,
		`- 脆弱性修正: ${report.vulnerabilityCommits.length}件`,
		'',
	];
	if (report.due) {
		const issue = renderIssue(report, line);
		lines.push(
			'### Issue',
			'',
			`タイトル: ${issue.title}`,
			'',
			'```markdown',
			issue.body,
			'```',
			'',
		);
	}
	summary.push(...lines);

	if (!apply) {
		continue;
	}
	const open = findOpenIssue(line);
	if (report.due) {
		const issue = renderIssue(report, line);
		if (!open) {
			gh(['issue', 'create', '--title', issue.title, '--body-file', '-'], issue.body);
		} else if (open.title !== issue.title || open.body.trim() !== issue.body.trim()) {
			gh(
				[
					'issue',
					'edit',
					String(open.number),
					'--title',
					issue.title,
					'--body-file',
					'-',
				],
				issue.body,
			);
		}
	} else if (open) {
		gh([
			'issue',
			'close',
			String(open.number),
			'--reason',
			'completed',
			'--comment',
			'利用者に届く未リリースの変更がなくなったので閉じます。',
		]);
	}
}

const output = summary.join('\n');
console.log(output);
if (process.env.GITHUB_STEP_SUMMARY) {
	appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${output}\n`);
}
