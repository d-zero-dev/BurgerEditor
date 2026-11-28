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
 * SemVer precedence. The root package has no semver library to depend on, so
 * the specs that compare versions (`published-ranges.spec.mjs`) use this.
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
