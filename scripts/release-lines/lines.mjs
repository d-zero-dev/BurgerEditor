/**
 * The release lines of BurgerEditor: which branch carries which major
 * version, what each line receives, and how the repository's automation
 * treats it. This file is the single definition; every other place that
 * names a branch (Renovate, workflows, the commit guard, CLAUDE.md,
 * SECURITY.md) is checked against it by `consistency.spec.mjs`, so a rename
 * or a retired line cannot leave a stale copy behind.
 *
 * ## Roles
 *
 * - `prerelease`: receives features, fixes and dependency updates. Renovate
 *   raises everything (major updates of `dependencies` wait for review) and
 *   unpublished changes open a release reminder.
 * - `maintenance`: receives vulnerability fixes and bug fixes, and only the
 *   former once the next major is stable. Renovate raises vulnerability fixes
 *   and lock file maintenance only, and unpublished changes open a release
 *   reminder.
 *
 * ## Rotation
 *
 * When the `prerelease` line ships its stable release, the previous
 * `maintenance` line drops to vulnerability fixes only and ends
 * {@link MAINTENANCE_MONTHS_AFTER_NEXT_STABLE} months after that release.
 * The procedure (what to change in this file and elsewhere) is the
 * `major-rotation` skill.
 *
 * ## What Renovate can and cannot fix
 *
 * Renovate's vulnerability pull requests cover direct dependencies only. A
 * vulnerable transitive dependency is refreshed by the weekly lock file
 * maintenance, or pinned by hand through `resolutions`.
 * @example
 * import { RELEASE_LINES } from './lines.mjs';
 * RELEASE_LINES.map((line) => line.branch); // ['dev', 'v3']
 */

/**
 * @typedef {'prerelease' | 'maintenance'} LineRole
 */

/**
 * @typedef {object} ReleaseLine
 * @property {string} id The label used in prose and tables (`v3`).
 * @property {number} major The major version the line publishes.
 * @property {LineRole} role What the line is for (see the roles above).
 * @property {string} branch The branch pull requests target.
 * @property {string} [releaseBranch] The branch releases are cut on, when it
 *   differs from `branch`.
 * @property {string} tagPrefix The prefix of this line's release tags.
 * @property {'full' | 'security-only'} renovate What Renovate raises on `branch`.
 * @property {boolean} reminder Whether unpublished changes open a reminder Issue.
 * @property {boolean} commitGuard Whether `.husky/pre-commit` refuses commits
 *   on `branch`. Branches that `lerna version` writes release commits to
 *   (see {@link releaseCommitBranches}) are never guarded.
 */

/**
 * How long a `maintenance` line keeps receiving vulnerability fixes after the
 * next major is released as stable. CLAUDE.md and SECURITY.md state the same
 * number of months; `consistency.spec.mjs` fails when they differ.
 * @example
 * `${MAINTENANCE_MONTHS_AFTER_NEXT_STABLE} か月`; // '12 か月'
 */
export const MAINTENANCE_MONTHS_AFTER_NEXT_STABLE = 12;

/**
 * Newest line first.
 * @type {readonly ReleaseLine[]}
 * @example
 * RELEASE_LINES.find((line) => line.role === 'maintenance')?.branch; // 'v3'
 */
export const RELEASE_LINES = [
	{
		id: 'v4',
		major: 4,
		role: 'prerelease',
		branch: 'dev',
		releaseBranch: 'main',
		tagPrefix: 'v4.',
		renovate: 'full',
		reminder: true,
		commitGuard: true,
	},
	{
		id: 'v3',
		major: 3,
		role: 'maintenance',
		branch: 'v3',
		tagPrefix: 'v3.',
		renovate: 'security-only',
		reminder: true,
		commitGuard: false,
	},
];

/**
 * Every branch a workflow may name in `branches:`.
 * @returns {string[]}
 * @example
 * lineBranches(); // ['dev', 'main', 'v3']
 */
export function lineBranches() {
	return RELEASE_LINES.flatMap((line) =>
		line.releaseBranch ? [line.branch, line.releaseBranch] : [line.branch],
	);
}

/**
 * The branches `.husky/pre-commit` refuses commits on. The hook asks for this
 * list through `guarded-branches.mjs` instead of keeping its own copy.
 * @returns {string[]}
 * @example
 * guardedBranches(); // ['dev']
 */
export function guardedBranches() {
	return RELEASE_LINES.filter((line) => line.commitGuard).map((line) => line.branch);
}

/**
 * The branches `lerna version` writes its release commit to, with commit
 * hooks enabled: the release branch of a line, or its own branch when it has
 * none. `.husky/pre-commit` must never guard these.
 * @returns {string[]}
 * @example
 * releaseCommitBranches(); // ['main', 'v3']
 */
export function releaseCommitBranches() {
	return RELEASE_LINES.map((line) => line.releaseBranch ?? line.branch);
}
