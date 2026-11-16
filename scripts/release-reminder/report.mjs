/**
 * Decides whether a release line holds changes that reach npm users and have
 * waited for a release longer than {@link REMINDER_AFTER_DAYS} days. The
 * decision reads only git (through the `git` function the caller passes) and
 * imports only Node.js built-ins, so the workflow that runs it installs
 * nothing.
 *
 * ## Baseline
 *
 * The highest version among the tags of the line that the branch contains
 * (`git tag --merged`), by SemVer precedence: a stable release outranks its
 * prereleases, and a line that has no stable release yet is measured from its
 * newest prerelease. `git describe` and `lerna changed` are not used: a
 * release is committed on `main` and merged back, so on the development
 * branch its tag is reachable only through the second parent of the
 * merge-back and `git describe` picks an older tag.
 *
 * Until the merge-back lands, the tag exists only on the release branch, so
 * the tags the release branch contains count too (`releaseRef`). Without
 * them, a release that is published but not merged back yet would make every
 * released change look unreleased.
 *
 * This depends on the merge-back being a merge commit. A squash merge copies
 * the release commit without the tag's history, `git tag --merged` then
 * returns an older tag, and every change since that tag counts as unreleased:
 * the reminder opens a wrong Issue every day. The merge queue of the
 * development branch is set to merge commits for this reason (see the
 * `npm-publish` skill).
 *
 * ## What counts as reaching users
 *
 * In a public package: the files `npm pack` ships (the `files` field, except
 * `dist`, which is build output) and the build input under `src/`, minus
 * Markdown, specs, snapshots, fixtures and stories; and the fields of
 * `package.json` a consumer resolves (`dependencies`, `peerDependencies`,
 * `engines`, `exports`, ...). Not `version`, `devDependencies`, a private
 * package, or `yarn.lock`.
 *
 * ## Clock
 *
 * The first-parent commit that brought a counted change in, i.e. when it
 * landed. Only changes still present in the cumulative diff from the baseline
 * count, so the merge that brings a release back into the development branch
 * (a version bump and a changelog) does not start it.
 * @example
 * import { execFileSync } from 'node:child_process';
 * import { analyzeLine } from './report.mjs';
 * const git = (args) => execFileSync('git', args, { encoding: 'utf8' });
 * analyzeLine({ git, ref: 'origin/dev', line: { id: 'v4', tagPrefix: 'v4.' } }).due;
 */

/**
 * How long a counted change may wait for a release before a reminder opens.
 * CLAUDE.md and the workflow state the same number of days;
 * `consistency.spec.mjs` fails when they differ.
 * @example
 * new Date(Date.now() - REMINDER_AFTER_DAYS * 86_400_000); // the oldest change that is not yet due
 */
export const REMINDER_AFTER_DAYS = 3;

const DAY_MS = 86_400_000;
const PACKAGES_DIR = 'packages/@burger-editor';

/** The fields of a `package.json` that a consumer's install resolves. */
const CONSUMER_FIELDS = [
	'dependencies',
	'peerDependencies',
	'peerDependenciesMeta',
	'optionalDependencies',
	'bundledDependencies',
	'engines',
	'exports',
	'imports',
	'bin',
	'main',
	'module',
	'types',
	'typings',
	'files',
	'type',
	'sideEffects',
	'os',
	'cpu',
];

const NOT_CODE = [
	/\.mdx?$/i,
	/\.(spec|test)\.[cm]?[jt]sx?$/,
	/\.stories\.[cm]?[jt]sx?$/,
	/(^|\/)__(tests|snapshots|fixtures)__\//,
	/(^|\/)(fixtures|test-data|testdata)\//,
];

// A bare "security" is not enough: `docs: tighten security review wording`
// is not a fix. Renovate titles its vulnerability pull requests `[security]`,
// and the maintainers' batches are branches named `security-update-*`.
const VULNERABILITY =
	/\[security\]|\bCVE-\d{4}-\d+|\b(?:vulnerability|vulnerabilities|vulnerable)\b|\bsecurity[ -](?:update|fix|advisory)/i;

/**
 * @param {string} version A version, with or without the leading `v`.
 * @returns {{ core: number[], pre: string[] | null }}
 */
function parseVersion(version) {
	const [core, ...rest] = version.replace(/^v/, '').split('-');
	return {
		core: core.split('.').map(Number),
		pre: rest.length > 0 ? rest.join('-').split('.') : null,
	};
}

/**
 * SemVer precedence.
 * @param {string} a
 * @param {string} b
 * @returns {number} Positive when `a` is the higher version.
 * @example
 * compareVersions('3.5.0', '3.5.0-alpha.3') > 0; // true
 */
export function compareVersions(a, b) {
	const left = parseVersion(a);
	const right = parseVersion(b);
	for (let i = 0; i < 3; i++) {
		const difference = (left.core[i] ?? 0) - (right.core[i] ?? 0);
		if (difference !== 0) {
			return difference;
		}
	}
	if (!left.pre && !right.pre) {
		return 0;
	}
	if (!left.pre) {
		return 1;
	}
	if (!right.pre) {
		return -1;
	}
	for (let i = 0; i < Math.max(left.pre.length, right.pre.length); i++) {
		const x = left.pre[i];
		const y = right.pre[i];
		if (x === undefined) {
			return -1;
		}
		if (y === undefined) {
			return 1;
		}
		const numeric = /^\d+$/.test(x) && /^\d+$/.test(y);
		if (numeric && Number(x) !== Number(y)) {
			return Number(x) - Number(y);
		}
		if (!numeric && x !== y) {
			if (/^\d+$/.test(x)) {
				return -1;
			}
			if (/^\d+$/.test(y)) {
				return 1;
			}
			return x < y ? -1 : 1;
		}
	}
	return 0;
}

/**
 * @param {readonly string[]} tags
 * @param {string} tagPrefix The prefix of the line's tags (`v4.`).
 * @returns {string | null} The highest tag of the line.
 * @example
 * pickBaseline(['v3.5.0-alpha.3', 'v3.5.0', 'v4.0.0-alpha.77'], 'v3.'); // 'v3.5.0'
 */
export function pickBaseline(tags, tagPrefix) {
	const candidates = tags.filter(
		(tag) => tag.startsWith(tagPrefix) && /^v\d+\.\d+\.\d+/.test(tag),
	);
	if (candidates.length === 0) {
		return null;
	}
	let highest = candidates[0];
	for (const tag of candidates) {
		if (compareVersions(tag, highest) > 0) {
			highest = tag;
		}
	}
	return highest;
}

/**
 * @param {string} output
 * @returns {string[]}
 */
const lines = (output) => output.split('\n').filter(Boolean);

/**
 * @param {(args: string[]) => string} git
 * @param {string} rev
 * @param {string} file
 * @returns {Record<string, unknown> | null} The parsed JSON file, or null when it does not exist at `rev`.
 * Any other failure (a bad revision, a file that is not JSON) throws: a package
 * whose `package.json` could not be read would otherwise drop out of the
 * report and its changes would never be counted.
 */
function readJson(git, rev, file) {
	let text;
	try {
		text = git(['show', `${rev}:${file}`]);
	} catch (error) {
		const message = String(error?.stderr ?? error?.message ?? '');
		if (/does not exist in|exists on disk, but not in/.test(message)) {
			return null;
		}
		throw error;
	}
	return JSON.parse(text);
}

/**
 * @param {(args: string[]) => string} git
 * @param {string} rev
 * @returns {Map<string, { files: string[], isPrivate: boolean }>} The packages of the workspace at `rev`, by directory.
 */
function readPackages(git, rev) {
	const packages = new Map();
	for (const dir of lines(git(['ls-tree', '--name-only', rev, `${PACKAGES_DIR}/`]))) {
		const json = readJson(git, rev, `${dir}/package.json`);
		if (json) {
			packages.set(dir, { files: json.files ?? [], isPrivate: json.private === true });
		}
	}
	return packages;
}

/**
 * @param {string} relative A path relative to the package directory.
 * @param {string} entry An entry of the `files` field.
 * @returns {boolean}
 */
function matchesFilesEntry(relative, entry) {
	if (entry.includes('*')) {
		const pattern = entry
			.split('*')
			.map((part) => part.replaceAll(/[$()+.?[\\\]^{|}]/g, String.raw`\$&`))
			.join('[^/]*');
		return new RegExp(`^${pattern}$`).test(relative);
	}
	const normalized = entry.replace(/^\.\//, '').replace(/\/$/, '');
	return relative === normalized || relative.startsWith(`${normalized}/`);
}

/**
 * @param {string} file A repository-relative path.
 * @param {Map<string, { files: string[], isPrivate: boolean }>} packages
 * @returns {'package-json' | 'code' | null}
 */
function classify(file, packages) {
	const match = /^packages\/@burger-editor\/([^/]+)\/(.+)$/.exec(file);
	if (!match) {
		return null;
	}
	const pkg = packages.get(`${PACKAGES_DIR}/${match[1]}`);
	if (!pkg || pkg.isPrivate) {
		return null;
	}
	const relative = match[2];
	if (relative === 'package.json') {
		return 'package-json';
	}
	if (NOT_CODE.some((pattern) => pattern.test(relative))) {
		return null;
	}
	if (relative.startsWith('src/')) {
		return 'code';
	}
	const ships = pkg.files.some(
		(entry) => entry !== 'dist' && matchesFilesEntry(relative, entry),
	);
	return ships ? 'code' : null;
}

/**
 * @param {(args: string[]) => string} git
 * @param {string} from
 * @param {string} to
 * @param {string} file A `package.json` path.
 * @returns {boolean} Whether a field a consumer resolves differs between the revisions.
 */
function consumerFieldsChanged(git, from, to, file) {
	const before = readJson(git, from, file);
	const after = readJson(git, to, file);
	if (!before || !after) {
		return before !== after;
	}
	return CONSUMER_FIELDS.some(
		(field) => JSON.stringify(before[field]) !== JSON.stringify(after[field]),
	);
}

/**
 * @typedef {object} LineReport
 * @property {string | null} baseline The tag the line is measured from.
 * @property {string[]} changes The files of the cumulative diff that reach users.
 * @property {Date | null} since When the oldest of them landed.
 * @property {boolean} due Whether `since` is older than the reminder period.
 * @property {{ sha: string, subject: string }[]} vulnerabilityCommits First-parent commits since the baseline that fix a vulnerability.
 */

/**
 * @param {object} options
 * @param {(args: string[]) => string} options.git Runs git and returns stdout.
 * @param {string} options.ref The branch (or any revision) of the line.
 * @param {string | null} [options.releaseRef] The release branch of the line,
 *   when it has one: its tags count for the baseline even before the merge back.
 * @param {{ id: string, tagPrefix: string }} options.line
 * @param {Date} [options.now]
 * @returns {LineReport}
 * @example
 * analyzeLine({ git, ref: 'origin/dev', releaseRef: 'origin/main', line: { id: 'v4', tagPrefix: 'v4.' } });
 */
export function analyzeLine({ git, ref, releaseRef, line, now = new Date() }) {
	const baseline = pickBaseline(
		[ref, releaseRef]
			.filter(Boolean)
			.flatMap((revision) =>
				lines(git(['tag', '--merged', revision, '--list', `${line.tagPrefix}*`])),
			),
		line.tagPrefix,
	);
	if (!baseline) {
		return { baseline, changes: [], since: null, due: false, vulnerabilityCommits: [] };
	}

	const packages = readPackages(git, ref);
	const changes = new Set();
	for (const file of lines(git(['diff', '--name-only', baseline, ref]))) {
		const kind = classify(file, packages);
		if (
			kind === 'code' ||
			(kind === 'package-json' && consumerFieldsChanged(git, baseline, ref, file))
		) {
			changes.add(file);
		}
	}

	/** @type {Date | null} */
	let since = null;
	if (changes.size > 0) {
		const landed = lines(
			git([
				'log',
				'--first-parent',
				'--reverse',
				'--format=%H%x09%cI',
				`${baseline}..${ref}`,
			]),
		);
		for (const entry of landed) {
			const [sha, committed] = entry.split('\t');
			const touched = lines(git(['diff', '--name-only', `${sha}^1`, sha]));
			const brought = touched.some(
				(file) =>
					changes.has(file) &&
					(classify(file, packages) === 'code' ||
						consumerFieldsChanged(git, `${sha}^1`, sha, file)),
			);
			if (brought) {
				since = new Date(committed);
				break;
			}
		}
	}

	const vulnerabilityCommits = lines(
		git(['log', '--first-parent', '--format=%h%x09%s', `${baseline}..${ref}`]),
	)
		.map((entry) => {
			const [sha, ...subject] = entry.split('\t');
			return { sha, subject: subject.join('\t') };
		})
		.filter(({ subject }) => VULNERABILITY.test(subject));

	return {
		baseline,
		changes: [...changes].toSorted(),
		since,
		due:
			since !== null && now.getTime() - since.getTime() >= REMINDER_AFTER_DAYS * DAY_MS,
		vulnerabilityCommits,
	};
}

/**
 * The marker on the first line of the Issue body, by which the Issue of a
 * line is found again.
 * @param {{ id: string }} line
 * @returns {string}
 * @example
 * issueMarker({ id: 'v4' }); // '<!-- release-reminder:v4 -->'
 */
export function issueMarker(line) {
	return `<!-- release-reminder:${line.id} -->`;
}

/**
 * @param {LineReport} report
 * @param {{ id: string, branch: string }} line
 * @returns {{ title: string, body: string }}
 * @example
 * renderIssue(report, { id: 'v4', branch: 'dev' }).title;
 */
export function renderIssue(report, line) {
	const listed = report.changes.slice(0, 30);
	const body = [
		issueMarker(line),
		`\`${line.id}\`（\`${line.branch}\`）に、利用者に届く変更が\`${report.baseline}\`以降リリースされないまま${REMINDER_AFTER_DAYS}日以上残っています。`,
		'',
		`- 最初の変更が入った日時: ${report.since?.toISOString() ?? '-'}`,
		`- 起点のタグ: \`${report.baseline}\``,
		'',
		'## 脆弱性修正',
		'',
		...(report.vulnerabilityCommits.length > 0
			? report.vulnerabilityCommits.map(({ sha, subject }) => `- ${sha} ${subject}`)
			: ['- なし']),
		'',
		`## 利用者に届く変更のあるファイル（${report.changes.length}件）`,
		'',
		...listed.map((file) => `- \`${file}\``),
		...(report.changes.length > listed.length
			? [`- ほか${report.changes.length - listed.length}件`]
			: []),
		'',
		'リリースは`npm-publish`スキルの手順で行います（v3 系は、同スキルの「v3 のリリース」）。このIssueはリリース後の次の実行で閉じられます。',
		'',
	].join('\n');
	return {
		title: `${line.id}のリリース漏れ: ${report.baseline}以降の変更が未リリース`,
		body,
	};
}
