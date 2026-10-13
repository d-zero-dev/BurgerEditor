/**
 * Vitest projects partitioned into groups that `scripts/run-vitest-groups.mjs`
 * runs one after another, each group in its own `vitest run` process.
 *
 * Running every project in one process exhausts the local Docker VM's
 * memory (8GB by default on Docker Desktop): each browser project launches
 * its own Chromium, and Vitest keeps all of them alive until the whole run
 * ends, so `sequence.groupOrder` only reorders work without lowering the
 * peak (#997). A separate process per group is the only way to release a
 * group's Chromium instances before the next group starts.
 *
 * Groups are sized from each project's standalone peak memory measured in
 * the `bge-vr` container (#997): the largest, `client`, peaks around 2.8GiB,
 * and each group is kept to roughly 4GiB in total. When adding a project
 * to `vitest.config.ts`, add it here too — the config refuses to load
 * otherwise. Measure a new browser project's standalone peak first
 * (`docker stats` while `yarn test --project <name>` runs) and give it its
 * own group when joining an existing one would exceed that budget; nothing
 * enforces the budget automatically.
 * @type {readonly (readonly string[])[]}
 */
export const VITEST_PROJECT_GROUPS = [
	['default', 'local', 'local/import', 'local/client'], // Node / jsdom（Chromiumを起動しない）
	['core', 'custom-element'], // ブラウザ
	['local/client-browser', 'vr'], // ブラウザ
	['client'], // ブラウザ（単独ピーク最大のため1プロジェクトで1グループ）
	['blocks', 'blocks-editor'], // ブラウザ
];

/**
 * @param {unknown} project - An entry of `test.projects`.
 * @returns {string}
 */
function projectName(project) {
	const name =
		typeof project === 'object' && project !== null && 'test' in project
			? /** @type {{ test?: { name?: unknown } }} */ (project).test?.name
			: undefined;
	if (typeof name === 'string') {
		return name;
	}
	if (typeof name === 'object' && name !== null && 'label' in name) {
		return String(name.label);
	}
	throw new Error(
		'Every entry of test.projects in vitest.config.ts must be an inline config with test.name, ' +
			'so scripts/vitest-project-groups.js can assign it to a group',
	);
}

/**
 * Throws when a project in `vitest.config.ts` is missing from
 * `VITEST_PROJECT_GROUPS` (it would silently never run under `yarn test`),
 * a group names a project that no longer exists, or a project is listed in
 * more than one group (it would run twice).
 * @template T
 * @param {T[]} projects - The `test.projects` array of `vitest.config.ts`.
 * @returns {T[]} The same array, so the call can wrap the literal in place.
 */
export function assertProjectsGrouped(projects) {
	const configured = new Set(projects.map((project) => projectName(project)));
	const all = VITEST_PROJECT_GROUPS.flat();
	const grouped = new Set(all);
	const ungrouped = [...configured].filter((name) => !grouped.has(name));
	const unknown = [...grouped].filter((name) => !configured.has(name));
	// 複数グループに登録されたプロジェクトはyarn testで2回実行される
	const duplicated = [...grouped].filter(
		(name) => all.indexOf(name) !== all.lastIndexOf(name),
	);
	if (ungrouped.length > 0 || unknown.length > 0 || duplicated.length > 0) {
		throw new Error(
			'scripts/vitest-project-groups.js is out of sync with vitest.config.ts' +
				(ungrouped.length > 0 ? `; not in any group: ${ungrouped.join(', ')}` : '') +
				(unknown.length > 0 ? `; no such project: ${unknown.join(', ')}` : '') +
				(duplicated.length > 0
					? `; in more than one group: ${duplicated.join(', ')}`
					: ''),
		);
	}
	return projects;
}
